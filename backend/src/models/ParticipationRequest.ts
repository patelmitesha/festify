import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Event from './Event';

export interface ParticipationRequestAttributes {
  request_id?: number;
  event_id: number;
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: Date;
  updated_at?: Date;
}

class ParticipationRequest extends Model<ParticipationRequestAttributes> implements ParticipationRequestAttributes {
  public request_id!: number;
  public event_id!: number;
  public name!: string;
  public address?: string;
  public contact_number?: string;
  public email?: string;
  public message?: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public created_at!: Date;
  public updated_at!: Date;

  // Association properties
  public Event?: Event;
}

ParticipationRequest.init(
  {
    request_id: {
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
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    modelName: 'ParticipationRequest',
    tableName: 'participation_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

ParticipationRequest.belongsTo(Event, { foreignKey: 'event_id' });
Event.hasMany(ParticipationRequest, { foreignKey: 'event_id' });

export default ParticipationRequest;