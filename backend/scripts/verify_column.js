const mysql = require('mysql2/promise');

async function verifyColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    console.log('Checking participation_requests table structure...');

    // Show all columns in the table
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM participation_requests"
    );

    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Check specifically for coupon_bookings
    const [couponBookingsColumn] = await connection.execute(
      "SHOW COLUMNS FROM participation_requests LIKE 'coupon_bookings'"
    );

    if (couponBookingsColumn.length > 0) {
      console.log('\n✓ coupon_bookings column exists');
    } else {
      console.log('\n✗ coupon_bookings column is missing');
    }

  } catch (error) {
    console.error('Error checking table:', error);
  } finally {
    await connection.end();
  }
}

require('dotenv').config();
verifyColumn();