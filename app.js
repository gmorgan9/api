const express = require('express');
const { Pool } = require('pg');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt'); // Use bcrypt for password hashing
const cors = require('cors');

// Load environment variables from .env
require('dotenv').config();

// Enable CORS for specific origins
const corsOptions = {
  origin: ['https://app-aarc.morganserver.com'],
  credentials: true, // Include cookies in CORS requests
};
app.use(cors(corsOptions));

// Configure express-session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use environment variable for the session secret
    resave: false,
    saveUninitialized: true,
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // For local development; remove in production.
  },
});

// Check if the server successfully connects to the database
pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL database');
    startServer();
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL database', err);
  });

function startServer() {
  // Handle JSON requests
  app.use(express.json());

  // Endpoint to handle user login
  app.post('/api/login', async (req, res) => {
    const { work_email, password } = req.body;

    try {
      // Query the database to check user credentials
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users WHERE work_email = $1', [work_email]);

      if (result.rows.length === 1) {
        // Get the hashed password from the database
        const hashedPasswordFromDB = result.rows[0].password;

        // Compare the provided password with the hashed password
        const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDB);

        if (passwordMatch) {
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

  // Start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
