const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'hetarth@123',
  database: 'festify'
};

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login attempt started');
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log('🔐 Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      'SELECT user_id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
      [email]
    );

    await connection.end();

    if (rows.length === 0) {
      console.log('🔐 User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log(`🔐 User found: ${user.name} (ID: ${user.user_id})`);
    console.log(`🔐 Password hash exists: ${user.password_hash ? 'Yes' : 'No'}`);

    if (!user.password_hash) {
      console.log('🔐 No password hash found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log(`🔐 Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('🔐 Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id },
      'fallback-secret-key',
      { expiresIn: '7d' }
    );

    console.log('🔐 Login successful, sending response');
    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token
    });

  } catch (error) {
    console.error('🔐 Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, email, password_hash]
    );

    const userId = result.insertId;

    // Get created user
    const [newUser] = await connection.execute(
      'SELECT user_id, name, email, created_at, updated_at FROM users WHERE user_id = ?',
      [userId]
    );

    await connection.end();

    const user = newUser[0];
    const token = jwt.sign(
      { userId: user.user_id },
      'fallback-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    message: 'Festify API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Ready to test login: curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"patelmitesha@gmail.com","password":"miteshpatel"}'`);
});