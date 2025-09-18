const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixUserPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hetarth@123',
    database: 'festify'
  });

  try {
    // Hash the password 'miteshpatel'
    const password = 'miteshpatel';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('Hashed password:', hashedPassword);

    // Update the user's password hash
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'patelmitesha@gmail.com']
    );

    console.log('Update result:', result);

    // Verify the update
    const [rows] = await connection.execute(
      'SELECT user_id, name, email, password_hash FROM users WHERE email = ?',
      ['patelmitesha@gmail.com']
    );

    console.log('Updated user:', rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixUserPassword();