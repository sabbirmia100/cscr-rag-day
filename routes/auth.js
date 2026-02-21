const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ragday_secret';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (username !== adminUsername) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    let validPassword = false;
    if (adminPasswordHash) {
      validPassword = await bcrypt.compare(password, adminPasswordHash);
    } else {
      validPassword = password === adminPassword;
    }

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ username: adminUsername }, JWT_SECRET, { expiresIn: '8h' });

    return res.json({ success: true, token, username: adminUsername });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;
