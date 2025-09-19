const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function updateDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    console.log('Connected to database successfully!');

    // Check if role column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'festify'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'role'
    `);

    if (columns.length === 0) {
      console.log('Adding role column to users table...');
      await connection.execute(`
        ALTER TABLE users ADD COLUMN role ENUM('manager', 'representative') NOT NULL DEFAULT 'manager'
      `);
      console.log('✓ Role column added successfully');
    } else {
      console.log('✓ Role column already exists');
    }

    // Check if created_by column already exists
    const [createdByColumns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'festify'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'created_by'
    `);

    if (createdByColumns.length === 0) {
      console.log('Adding created_by column to users table...');
      await connection.execute(`
        ALTER TABLE users ADD COLUMN created_by INT NULL,
        ADD FOREIGN KEY (created_by) REFERENCES users(user_id)
      `);
      console.log('✓ Created_by column added successfully');
    } else {
      console.log('✓ Created_by column already exists');
    }

    // Check if event_representatives table exists
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
      console.log('✓ Event_representatives table created successfully');
    } else {
      console.log('✓ Event_representatives table already exists');
    }

    // Insert sample admin user if it doesn't exist
    const [adminUser] = await connection.execute(`
      SELECT user_id FROM users WHERE email = 'admin@festify.com'
    `);

    if (adminUser.length === 0) {
      console.log('Creating sample admin user...');
      await connection.execute(`
        INSERT INTO users (name, email, password_hash, role) VALUES
        ('Admin Manager', 'admin@festify.com', '$2a$12$LQv3c1yqBw1mA4H6GEwxGOjHr5P.Zsx0KrB.TYKlcIwFzHhKtUd4a', 'manager')
      `);
      console.log('✓ Sample admin user created (email: admin@festify.com, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('\n🎉 Database update completed successfully!');
    console.log('You can now use the User Management features in the application.');

  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await connection.end();
  }
}

updateDatabase();