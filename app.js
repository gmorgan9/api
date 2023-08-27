const express = require('express');
const { Pool } = require('pg');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

// Enable CORS for specific origins
const corsOptions = {
  origin: 'https://app-aarc.morganserver.com/', // Allow requests from this origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Define the HTTP methods allowed
  credentials: true, // Include cookies in CORS requests if needed
  optionsSuccessStatus: 204, // Set the preflight response status code to 204
};

app.use(cors(corsOptions));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function startServer() {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL database');

    app.use(express.json());

    app.post('/api/login', async (req, res) => {
      const { work_email, password } = req.body;
    
      try {
        console.log('Received login request for:', work_email);
    
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE work_email = $1', [work_email]);
    
        if (result.rows.length === 1) {
          const hashedPasswordFromDB = result.rows[0].password;
          const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDB);
    
          if (passwordMatch) {
            req.session.user = result.rows[0];
            console.log('Login successful, redirecting...');
            // Send a success response for the POST request
            return res.redirect(302, 'https://app-aarc.morganserver.com/dashboard/');
          } else {
            return res.status(401).json({ success: false, message: 'Invalid password' });
          }
        } else {
          return res.status(401).json({ success: false, message: 'User not found' });
        }
    
        client.release();
      } catch (err) {
        console.error('Error during login', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    });
    
    
    
    

    app.get('/api/check-auth', (req, res) => {
      if (req.session.user) {
        return res.json({ authenticated: true, user: req.session.user });
      } else {
        return res.json({ authenticated: false });
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Error connecting to PostgreSQL database', err);
  }
}

startServer();
