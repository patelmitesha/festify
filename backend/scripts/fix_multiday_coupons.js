const mysql = require('mysql2/promise');

async function fixMultidayCoupons() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hetarth@123',
    database: 'festify'
  });

  try {
    console.log('Starting to fix multiday coupons...');

    // Get all events with their duration
    const [events] = await connection.execute(`
      SELECT event_id, name, start_date, end_date,
             DATEDIFF(end_date, start_date) + 1 as duration_days
      FROM events
      WHERE DATEDIFF(end_date, start_date) > 0
    `);

    console.log(`Found ${events.length} multiday events`);

    for (const event of events) {
      console.log(`\nFixing coupons for event: ${event.name} (${event.duration_days} days)`);

      // Update all coupons for this event to have correct total_count
      const [result] = await connection.execute(`
        UPDATE coupons
        SET total_count = ?,
            status = CASE
              WHEN consumed_count = 0 THEN 'Booked'
              WHEN consumed_count >= ? THEN 'Consumed'
              ELSE 'Partial'
            END
        WHERE event_id = ? AND total_count = 1
      `, [event.duration_days, event.duration_days, event.event_id]);

      console.log(`Updated ${result.affectedRows} coupons for event ${event.name}`);
    }

    console.log('\nFixing completed successfully!');
  } catch (error) {
    console.error('Error fixing coupons:', error);
  } finally {
    await connection.end();
  }
}

fixMultidayCoupons();