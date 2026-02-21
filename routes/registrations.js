const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const {
  sendAdminNotification,
  sendApprovalEmail,
  sendRejectionEmail,
} = require('../services/email');
const { appendRegistrationRow } = require('../services/googleSheets');
const { supabase } = require('../services/supabase');

const router = express.Router();

const uploadsDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = String(Date.now()) + '-' + String(Math.round(Math.random() * 1e9));
    cb(null, 'txn-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /.(jpeg|jpg|png|gif|webp|pdf)$/i;
  const allowedMime = /^(image\\\/(jpeg|jpg|png|gif|webp)|application\\\/pdf)$/i;

  if (allowedExt.test(file.originalname) && allowedMime.test(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Only jpg, png, gif, webp, and pdf files are allowed.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const mapRegistration = (row) => ({ ...row, _id: row.id });

const isDuplicateError = (error) => error && error.code === '23505';

const duplicateMessage = (error) => {
  const detail = (error && error.details) || '';
  if (detail.includes('(email)')) {
    return 'This email address is already registered.';
  }
  if (detail.includes('(transaction_id)')) {
    return 'This Transaction ID has already been used. Please check and try again.';
  }
  return 'Duplicate entry detected.';
};

const allowedPaymentMethods = new Set(['Bkash', 'Nagad']);
const allowedTshirtSizes = new Set(['M', 'L', 'XL', 'XXL']);

const isMissingColumnError = (error, columnName) => {
  if (!error) return false;
  const content = [
    error.code || '',
    error.message || '',
    error.details || '',
    error.hint || '',
  ].join(' ').toLowerCase();
  return content.includes('column') && content.includes(columnName.toLowerCase());
};

const insertRegistration = (payload) => (
  supabase
    .from('registrations')
    .insert(payload)
    .select('*')
    .single()
);

router.post('/register', upload.single('screenshot'), async (req, res) => {
  try {
    const {
      name,
      roll,
      section,
      department,
      email,
      phone,
      payment_method,
      tshirt_size,
      transaction_id,
      payment_time,
    } = req.body;

    const required = { name, roll, section, department, email, payment_method, tshirt_size, transaction_id };
    for (const [field, value] of Object.entries(required)) {
      if (!value || !value.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Field "' + field + '" is required.' });
      }
    }

    const normalizedPaymentMethod = payment_method.toString().trim();
    if (!allowedPaymentMethods.has(normalizedPaymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method. Please select Bkash or Nagad.' });
    }

    const normalizedTshirtSize = tshirt_size.toString().trim().toUpperCase();
    if (!allowedTshirtSizes.has(normalizedTshirtSize)) {
      return res.status(400).json({ success: false, message: 'Invalid T-shirt size. Please select M, L, XL or XXL.' });
    }

    const payload = {
      name: name.trim(),
      roll: roll.trim(),
      section: section.trim(),
      department: department.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      payment_method: normalizedPaymentMethod,
      tshirt_size: normalizedTshirtSize,
      transaction_id: transaction_id.trim(),
      payment_time: (payment_time && payment_time.toString().trim()) || new Date().toISOString(),
      screenshot: req.file ? req.file.filename : '',
      status: 'pending',
    };

    let { data, error } = await insertRegistration(payload);

    // Backward compatibility for old DB schema where tshirt_size column may not exist yet.
    if (error && isMissingColumnError(error, 'tshirt_size')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.tshirt_size;
      ({ data, error } = await insertRegistration(fallbackPayload));
    }

    if (error) {
      if (isDuplicateError(error)) {
        return res.status(409).json({ success: false, message: duplicateMessage(error) });
      }
      console.error('Insert registration failed:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to save registration.' });
    }

    sendAdminNotification(payload).catch((err) => {
      console.error('Admin email failed:', err.message);
    });

    try {
      // Await sheet append so each successful submission reliably triggers a row insert.
      await appendRegistrationRow(payload);
    } catch (err) {
      console.error('Google Sheets append failed:', err.message);
    }

    return res.status(201).json({
      success: true,
      data: mapRegistration(data),
      message: 'Registration submitted successfully. Please wait for confirmation email.',
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

router.get('/admin/registrations', requireAuth, async (req, res) => {
  try {
    let query = supabase.from('registrations').select('*').order('created_at', { ascending: false });

    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      query = query.eq('status', req.query.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch registrations failed:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch registrations.' });
    }

    const mapped = (data || []).map(mapRegistration);
    return res.json({ success: true, data: mapped, total: mapped.length });
  } catch (err) {
    console.error('Fetch registrations error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch registrations.' });
  }
});

router.get('/admin/registrations/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    return res.json({ success: true, data: mapRegistration(data) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch registration.' });
  }
});

router.patch('/admin/registrations/:id/approve', requireAuth, async (req, res) => {
  try {
    const { data: reg, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !reg) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    if (reg.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Registration is already approved.' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('registrations')
      .update({ status: 'approved' })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ success: false, message: 'Failed to approve registration.' });
    }

    sendApprovalEmail(updated).catch((err) => {
      console.error('Approval email failed:', err.message);
    });

    return res.json({ success: true, data: mapRegistration(updated), message: 'Registration approved and email sent.' });
  } catch (err) {
    console.error('Approve error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to approve registration.' });
  }
});

router.patch('/admin/registrations/:id/reject', requireAuth, async (req, res) => {
  try {
    const { data: reg, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !reg) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    if (reg.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Registration is already rejected.' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('registrations')
      .update({ status: 'rejected' })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ success: false, message: 'Failed to reject registration.' });
    }

    sendRejectionEmail(updated).catch((err) => {
      console.error('Rejection email failed:', err.message);
    });

    return res.json({ success: true, data: mapRegistration(updated), message: 'Registration rejected.' });
  } catch (err) {
    console.error('Reject error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reject registration.' });
  }
});

router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    const [{ count: total }, { count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
      supabase.from('registrations').select('*', { head: true, count: 'exact' }),
      supabase.from('registrations').select('*', { head: true, count: 'exact' }).eq('status', 'pending'),
      supabase.from('registrations').select('*', { head: true, count: 'exact' }).eq('status', 'approved'),
      supabase.from('registrations').select('*', { head: true, count: 'exact' }).eq('status', 'rejected'),
    ]);

    return res.json({
      success: true,
      data: {
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
      },
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

module.exports = router;
