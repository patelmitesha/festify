const mysql = require('mysql2/promise');

async function addParticipantsEmailColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'festify'
  });

  try {
    console.log('Connected to database');

    // Check if column already exists in participants table
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM participants LIKE 'email'"
    );

    if (columns.length > 0) {
      console.log('email column already exists in participants table');
      return;
    }

    // Add the email column to participants table
    await connection.execute(`
      ALTER TABLE \`participants\`
      ADD COLUMN \`email\` VARCHAR(100) DEFAULT NULL
      AFTER \`contact_number\`
    `);

    console.log('Successfully added email column to participants table');

    // Show updated table structure
    const [updatedColumns] = await connection.execute(
      "SHOW COLUMNS FROM participants"
    );

    console.log('Updated participants table structure:');
    updatedColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await connection.end();
  }
}

require('dotenv').config();
addParticipantsEmailColumn();