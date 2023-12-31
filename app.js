const express = require('express');
const { Pool } = require('pg');
const app = express();
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session'); // Add express-session
require('dotenv').config();

const corsOptions = {
    origin: 'https://app-aarc.morganserver.com', // Allow requests from this origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Define the HTTP methods allowed
    credentials: true, // Include cookies in CORS requests if needed
    optionsSuccessStatus: 204, // Set the preflight response status code to 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true })); // Initialize sessions

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Attempt to connect to the database
pool.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
    })
    .catch((err) => {
        console.error('Error connecting to PostgreSQL database', err);
    });

app.post('/api/login', async (req, res) => {
    const { work_email, password } = req.body;

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE work_email = $1', [work_email]);

        if (result.rows.length === 1) {
            const user = result.rows[0];
            const hashedPasswordFromDB = user.password;
            const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDB);

            if (passwordMatch) {
                // Store user data in session
                req.session.user = user;

                // Update the logged_in status for the user to 1
                await client.query('UPDATE users SET logged_in = 1 WHERE user_id = $1', [user.user_id]);

                console.log('Login successful for user:', work_email);
                return res.status(200).json({ success: true, message: 'Login successful-api' });
            } else {
                console.log('Invalid password for user:', work_email);
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

app.post('/api/logout', async (req, res) => {
    // Check if the user is logged in (session exists)
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const user = req.session.user;
        const client = await pool.connect();

        // Update the logged_in status for the user to 0
        await client.query('UPDATE users SET logged_in = 0 WHERE user_id = $1', [user.user_id]);

        // Destroy the session to log the user out
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session', err);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            console.log('Logout successful for user:', user.work_email);
            return res.status(200).json({ success: true, message: 'Logout successful' });
        });
    } catch (err) {
        console.error('Error during logout', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
