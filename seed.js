const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 12)
  .then((hash) => {
    console.log('Use these in .env:');
    console.log('ADMIN_USERNAME=admin');
    console.log('ADMIN_PASSWORD_HASH=' + hash);
    console.log('ADMIN_PASSWORD=');
  })
  .catch((err) => {
    console.error('Failed to generate hash:', err.message);
    process.exit(1);
  });
