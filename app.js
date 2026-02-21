require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const registrationRoutes = require('./routes/registrations');
const authRoutes = require('./routes/auth');

const app = express();

const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', registrationRoutes);
app.use('/api/admin', authRoutes);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

module.exports = app;
