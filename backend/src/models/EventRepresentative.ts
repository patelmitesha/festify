import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface EventRepresentativeAttributes {
  id?: number;
  event_id: number;
  user_id: number;
  assigned_by: number;
  permissions: string[];
  created_at?: Date;
  updated_at?: Date;
}

class EventRepresentative extends Model<EventRepresentativeAttributes> {}

EventRepresentative.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'events',
        key: 'event_id',
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['add_participants', 'redeem_coupons'],
    },
  },
  {
    sequelize,
    modelName: 'EventRepresentative',
    tableName: 'event_representatives',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default EventRepresentative;