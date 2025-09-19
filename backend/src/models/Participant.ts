import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Event from './Event';

// Import Coupon for proper typing
import type { CouponAttributes } from './Coupon';

// Forward declaration to avoid circular imports
declare class Coupon extends Model<CouponAttributes> implements CouponAttributes {
  public coupon_id: number;
  public participant_id: number;
  public event_id: number;
  public rate_id: number;
  public meal_id: number;
  public qr_code_value: string;
  public qr_code_link?: string;
  public status: 'Booked' | 'Consumed' | 'Partial';
  public consumed_count: number;
  public total_count: number;
  public created_at: Date;
  public updated_at: Date;
}

export interface ParticipantAttributes {
  participant_id?: number;
  event_id: number;
  name: string;
  address?: string;
  contact_number?: string;
}

class Participant extends Model<ParticipantAttributes> implements ParticipantAttributes {
  public participant_id!: number;
  public event_id!: number;
  public name!: string;
  public address?: string;
  public contact_number?: string;

  // Association properties
  public Coupons?: Coupon[];
}

Participant.init(
  {
    participant_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Event,
        key: 'event_id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Participant',
    tableName: 'participants',
    timestamps: false,
  }
);

Participant.belongsTo(Event, { foreignKey: 'event_id' });
Event.hasMany(Participant, { foreignKey: 'event_id' });

export default Participant;