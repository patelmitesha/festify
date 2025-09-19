const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    // Hash the password 'password123'
    const hashedPassword = await bcrypt.hash('password123', 12);
    console.log('New hashed password:', hashedPassword);

    // Update the user's password
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'patelmitesha@gmail.com']
    );

    console.log('Password updated successfully for patelmitesha@gmail.com');

    // Also update passwords for other users to 'password123'
    const users = [
      'test@example.com',
      'test2@example.com',
      'admin@festify.com',
      'vivek@gmail.com',
      'rep@festify.com'
    ];

    for (const email of users) {
      await connection.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hashedPassword, email]
      );
      console.log(`Password updated for ${email}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

updatePassword();