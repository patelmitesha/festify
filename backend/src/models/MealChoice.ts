import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Event from './Event';

export interface MealChoiceAttributes {
  meal_id?: number;
  event_id: number;
  meal_type: string;
}

class MealChoice extends Model<MealChoiceAttributes> implements MealChoiceAttributes {
  public meal_id!: number;
  public event_id!: number;
  public meal_type!: string;
}

MealChoice.init(
  {
    meal_id: {
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
    meal_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'MealChoice',
    tableName: 'meal_choices',
    timestamps: false,
  }
);

MealChoice.belongsTo(Event, { foreignKey: 'event_id' });
Event.hasMany(MealChoice, { foreignKey: 'event_id' });

export default MealChoice;