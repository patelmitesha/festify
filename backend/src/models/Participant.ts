import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Event from './Event';

// Forward declaration to avoid circular imports
declare class Coupon extends Model {}

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