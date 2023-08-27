const express = require('express');
const { Pool } = require('pg');
const app = express();
const session = require('express-session');

// Load environment variables from .env
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For local development; remove in production.
  }
});

// Configure express-session
app.use(session({
  secret: 'your_secret_key', // Change this to a strong, random secret
  resave: false,
  saveUninitialized: true
}));

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

  app.use(express.json()); // Parse JSON requests

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Endpoint to handle user login
  app.post('/api/login', async (req, res) => {
    const { work_email, password } = req.body;

    try {
      // Query the database to check user credentials
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users WHERE work_email = $1', [work_email]);

      if (result.rows.length === 1) {
        // Get the hashed password and salt from the database
        const { password: hashedPassword, salt } = result.rows[0];

        // Verify the provided password using the same salt and crypt function
        const isPasswordValid = crypt(password, salt) === hashedPassword;

        if (isPasswordValid) {
          // User is authenticated; store user data in the session
          req.session.user = result.rows[0];
          res.json({ success: true, message: 'Login successful' });
        } else {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Release the database connection
      client.release();
    } catch (err) {
      console.error('Error during login', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  // Endpoint to check if the user is authenticated
  app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.use((req, res, next) => {
    console.log(`Received ${req.method} request to ${req.url}`);
    next();
  });
}

// Function to reproduce the PostgreSQL crypt function
function crypt(password, salt) {
  // Implement the crypt logic here, using the provided password and salt
  // You can use a library like 'bcrypt' to handle this encryption securely
}
