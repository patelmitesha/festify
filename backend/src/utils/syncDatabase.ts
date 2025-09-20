import sequelize from '../config/database';
import {
  User,
  Event,
  CouponRate,
  MealChoice,
  Participant,
  Coupon,
  Redemption,
  EventRepresentative,
  ParticipationRequest
} from '../models';

/**
 * Synchronize database tables with Sequelize models
 * This will create the participation_requests table if it doesn't exist
 */
export const syncDatabase = async (force: boolean = false) => {
  try {
    console.log('🔄 Starting database synchronization...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Sync all models in order to respect foreign key constraints
    const models = [
      { model: User, name: 'users' },
      { model: Event, name: 'events' },
      { model: EventRepresentative, name: 'event_representatives' },
      { model: CouponRate, name: 'coupon_rates' },
      { model: MealChoice, name: 'meal_choices' },
      { model: Participant, name: 'participants' },
      { model: ParticipationRequest, name: 'participation_requests' }, // NEW TABLE
      { model: Coupon, name: 'coupons' },
      { model: Redemption, name: 'redemptions' }
    ];

    for (const { model, name } of models) {
      try {
        await model.sync({ force, alter: !force });
        console.log(`✅ Table '${name}' synchronized successfully`);
      } catch (error) {
        console.error(`❌ Error synchronizing table '${name}':`, error);
        throw error;
      }
    }

    console.log('🎉 Database synchronization completed successfully!');

    // Log table information
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    console.log('\n📊 Current database tables:');
    console.table(results);

  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
  }
};

/**
 * Check if participation_requests table exists
 */
export const checkParticipationRequestsTable = async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'participation_requests'
    `);

    const exists = (results as any)[0].count > 0;
    console.log(`📋 participation_requests table exists: ${exists ? '✅ Yes' : '❌ No'}`);

    if (exists) {
      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE participation_requests
      `);
      console.log('\n📝 participation_requests table structure:');
      console.table(columns);
    }

    return exists;
  } catch (error) {
    console.error('Error checking participation_requests table:', error);
    return false;
  }
};

// Auto-run if this file is executed directly
if (require.main === module) {
  syncDatabase()
    .then(() => {
      console.log('✅ Database sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database sync failed:', error);
      process.exit(1);
    });
}