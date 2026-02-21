const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
  console.log('Student form: http://localhost:' + PORT);
  console.log('Admin panel:  http://localhost:' + PORT + '/admin');
});
