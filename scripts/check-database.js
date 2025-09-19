const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    // Check if role column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'festify'
        AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Current users table columns:');
    console.table(columns);

    // Try to add role column if missing
    const roleExists = columns.some(col => col.COLUMN_NAME === 'role');
    if (!roleExists) {
      console.log('Adding role column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN role ENUM('manager', 'representative') NOT NULL DEFAULT 'manager'`);
      console.log('Role column added successfully');
    }

    const createdByExists = columns.some(col => col.COLUMN_NAME === 'created_by');
    if (!createdByExists) {
      console.log('Adding created_by column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN created_by INT NULL`);
      console.log('Created_by column added successfully');
    }

    // Check event_representatives table
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'festify'
        AND TABLE_NAME = 'event_representatives'
    `);

    if (tables.length === 0) {
      console.log('Creating event_representatives table...');
      await connection.execute(`
        CREATE TABLE event_representatives (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          user_id INT NOT NULL,
          assigned_by INT NOT NULL,
          permissions JSON NOT NULL DEFAULT ('["add_participants", "redeem_coupons"]'),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE KEY unique_event_user (event_id, user_id)
        )
      `);
      console.log('Event_representatives table created successfully');
    } else {
      console.log('Event_representatives table already exists');
    }

  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();