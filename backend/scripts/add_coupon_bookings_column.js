const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addCouponBookingsColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    console.log('Connected to database');

    // Check if column already exists
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM participation_requests LIKE 'coupon_bookings'"
    );

    if (columns.length > 0) {
      console.log('coupon_bookings column already exists');
      return;
    }

    // Add the column
    await connection.execute(`
      ALTER TABLE \`participation_requests\`
      ADD COLUMN \`coupon_bookings\` TEXT DEFAULT NULL
      AFTER \`message\`
    `);

    console.log('Successfully added coupon_bookings column to participation_requests table');

  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await connection.end();
  }
}

addCouponBookingsColumn();