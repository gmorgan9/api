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

  // Endpoint to retrieve user data
  app.get('/api/users', async (req, res) => {
    try {
      // Query the database to get user data
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users'); // Replace 'users' with your table name
      const users = result.rows;

      // Send the user data as JSON response
      res.json(users);

      // Release the database connection
      client.release();
    } catch (err) {
      console.error('Error retrieving user data', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.use((req, res, next) => {
    console.log(`Received ${req.method} request to ${req.url}`);
    next();
  });
}
