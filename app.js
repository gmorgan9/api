const express = require('express');
const { Pool } = require('pg');
const app = express();

// Load environment variables from .env
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For local development; remove in production.
  }
});

pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL database');
    startServer();
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL database', err);
  });

function startServer() {
  const port = process.env.PORT || 3000;

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
}
