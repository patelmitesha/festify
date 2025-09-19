import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface UserAttributes {
  user_id?: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'manager' | 'representative';
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

class User extends Model<UserAttributes> {}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('manager', 'representative'),
      allowNull: false,
      defaultValue: 'manager',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;