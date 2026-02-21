const nodemailer = require('nodemailer');

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const fromAddress = () => {
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.FROM_NAME || 'Rag Day Committee';
  return `"${fromName}" <${fromEmail}>`;
};

const adminRecipient = () => process.env.ADMIN_EMAIL || process.env.SMTP_USER;

const sendAdminNotification = async (registration) => {
  const transporter = createTransporter();

  const text = [
    'A new student has submitted Rag Day registration.',
    '',
    'Details:',
    `Name: ${registration.name}`,
    `Roll: ${registration.roll}`,
    `Section: ${registration.section}`,
    `Department: ${registration.department}`,
    `T-shirt Size: ${registration.tshirt_size || 'N/A'}`,
    `Email: ${registration.email}`,
    `Payment Method: ${registration.payment_method}`,
    `Transaction ID: ${registration.transaction_id}`,
    `Payment Time: ${registration.payment_time}`,
    '',
    'Please verify the payment and approve from the admin panel.',
  ].join('\n');

  return transporter.sendMail({
    from: fromAddress(),
    to: adminRecipient(),
    subject: 'New Rag Day Registration Submitted',
    text,
  });
};

const sendApprovalEmail = async (registration) => {
  const transporter = createTransporter();

  const text = [
    `Hello ${registration.name},`,
    '',
    'Your Rag Day registration has been approved.',
    '',
    'Details:',
    `Name: ${registration.name}`,
    `Roll: ${registration.roll}`,
    `Section: ${registration.section}`,
    `Department: ${registration.department}`,
    `T-shirt Size: ${registration.tshirt_size || 'N/A'}`,
    `Payment Method: ${registration.payment_method}`,
    `Transaction ID: ${registration.transaction_id}`,
    `Payment Time: ${registration.payment_time}`,
    '',
    'Please bring this email on the event day.',
    '',
    'Regards,',
    'Rag Day Committee',
  ].join('\n');

  return transporter.sendMail({
    from: fromAddress(),
    to: registration.email,
    subject: 'Rag Day Registration Approved \u{1F389}',
    text,
  });
};

const sendRejectionEmail = async (registration) => {
  const transporter = createTransporter();

  const text = [
    `Hello ${registration.name},`,
    '',
    'Your Rag Day registration was rejected after payment verification.',
    'Please contact the Rag Day Committee for support.',
    '',
    'Regards,',
    'Rag Day Committee',
  ].join('\n');

  return transporter.sendMail({
    from: fromAddress(),
    to: registration.email,
    subject: 'Rag Day Registration Rejected',
    text,
  });
};

module.exports = { sendAdminNotification, sendApprovalEmail, sendRejectionEmail };
