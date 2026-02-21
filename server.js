require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const registrationRoutes = require('./routes/registrations');
const authRoutes = require('./routes/auth');

app.use('/api', registrationRoutes);
app.use('/api/admin', authRoutes);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
  console.log('Student form: http://localhost:' + PORT);
  console.log('Admin panel:  http://localhost:' + PORT + '/admin');
});
