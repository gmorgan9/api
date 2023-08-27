const express = require('express');
const app = express();
const host = '100.118.102.62';
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/api/data', (req, res) => {
  const data = { message: 'This is your API data!' };
  res.json(data);
});

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});
