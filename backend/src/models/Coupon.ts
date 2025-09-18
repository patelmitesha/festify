import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Participant from './Participant';
import Event from './Event';
import CouponRate from './CouponRate';
import MealChoice from './MealChoice';

export interface CouponAttributes {
  coupon_id?: number;
  participant_id: number;
  event_id: number;
  rate_id: number;
  meal_id: number;
  qr_code_value: string;
  qr_code_link?: string;
  status: 'Booked' | 'Consumed' | 'Partial';
  consumed_count: number;
  total_count: number;
  created_at?: Date;
  updated_at?: Date;
}

class Coupon extends Model<CouponAttributes> implements CouponAttributes {
  public coupon_id!: number;
  public participant_id!: number;
  public event_id!: number;
  public rate_id!: number;
  public meal_id!: number;
  public qr_code_value!: string;
  public qr_code_link?: string;
  public status!: 'Booked' | 'Consumed' | 'Partial';
  public consumed_count!: number;
  public total_count!: number;
  public created_at!: Date;
  public updated_at!: Date;

  // Association properties
  public Participant?: Participant;
  public Event?: Event;
  public CouponRate?: CouponRate;
  public MealChoice?: MealChoice;
}

Coupon.init(
  {
    coupon_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    participant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Participant,
        key: 'participant_id',
      },
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Event,
        key: 'event_id',
      },
    },
    rate_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: CouponRate,
        key: 'rate_id',
      },
    },
    meal_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: MealChoice,
        key: 'meal_id',
      },
    },
    qr_code_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    qr_code_link: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Booked', 'Consumed', 'Partial'),
      defaultValue: 'Booked',
    },
    consumed_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Coupon',
    tableName: 'coupons',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Coupon.belongsTo(Participant, { foreignKey: 'participant_id' });
Participant.hasMany(Coupon, { foreignKey: 'participant_id' });

Coupon.belongsTo(Event, { foreignKey: 'event_id' });
Event.hasMany(Coupon, { foreignKey: 'event_id' });

Coupon.belongsTo(CouponRate, { foreignKey: 'rate_id' });
CouponRate.hasMany(Coupon, { foreignKey: 'rate_id' });

Coupon.belongsTo(MealChoice, { foreignKey: 'meal_id' });
MealChoice.hasMany(Coupon, { foreignKey: 'meal_id' });

export default Coupon;