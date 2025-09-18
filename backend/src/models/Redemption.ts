import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Coupon from './Coupon';
import User from './User';

export interface RedemptionAttributes {
  redemption_id?: number;
  coupon_id: number;
  redeemed_count: number;
  redeemed_at?: Date;
  redeemed_by?: number;
}

class Redemption extends Model<RedemptionAttributes> implements RedemptionAttributes {
  public redemption_id!: number;
  public coupon_id!: number;
  public redeemed_count!: number;
  public redeemed_at!: Date;
  public redeemed_by?: number;
}

Redemption.init(
  {
    redemption_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Coupon,
        key: 'coupon_id',
      },
    },
    redeemed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    redeemed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    redeemed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: 'user_id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Redemption',
    tableName: 'redemptions',
    timestamps: false,
  }
);

Redemption.belongsTo(Coupon, { foreignKey: 'coupon_id' });
Coupon.hasMany(Redemption, { foreignKey: 'coupon_id' });

Redemption.belongsTo(User, { foreignKey: 'redeemed_by' });
User.hasMany(Redemption, { foreignKey: 'redeemed_by' });

export default Redemption;