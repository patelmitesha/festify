const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'hetarth@123',
  database: 'festify'
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      'SELECT user_id, name, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    await connection.end();

    if (rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log(`User found: ${user.name}`);
    console.log(`Password hash exists: ${user.password_hash ? 'Yes' : 'No'}`);

    if (!user.password_hash) {
      console.log('No password hash found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log(`Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token: 'simple-token-for-testing'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ message: 'Simple login server is running' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Simple login server running on port ${PORT}`);
  console.log(`Test with: curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"patelmitesha@gmail.com","password":"miteshpatel"}'`);
});