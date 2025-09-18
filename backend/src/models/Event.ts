import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface EventAttributes {
  event_id?: number;
  user_id: number;
  name: string;
  description?: string;
  venue?: string;
  start_date: Date;
  end_date: Date;
  created_at?: Date;
  updated_at?: Date;
}

class Event extends Model<EventAttributes> implements EventAttributes {
  public event_id!: number;
  public user_id!: number;
  public name!: string;
  public description?: string;
  public venue?: string;
  public start_date!: Date;
  public end_date!: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

Event.init(
  {
    event_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'user_id',
      },
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    venue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Event',
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Event.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Event, { foreignKey: 'user_id' });

export default Event;