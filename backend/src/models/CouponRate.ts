import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Event from './Event';

export interface CouponRateAttributes {
  rate_id?: number;
  event_id: number;
  rate_type: 'Member' | 'Guest';
  price: number;
}

class CouponRate extends Model<CouponRateAttributes> implements CouponRateAttributes {
  public rate_id!: number;
  public event_id!: number;
  public rate_type!: 'Member' | 'Guest';
  public price!: number;
}

CouponRate.init(
  {
    rate_id: {
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
    rate_type: {
      type: DataTypes.ENUM('Member', 'Guest'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'CouponRate',
    tableName: 'coupon_rates',
    timestamps: false,
  }
);

CouponRate.belongsTo(Event, { foreignKey: 'event_id' });
Event.hasMany(CouponRate, { foreignKey: 'event_id' });

export default CouponRate;