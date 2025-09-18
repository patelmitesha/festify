import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'festify'
};

export interface User {
  user_id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: mysql.Pool;

  private constructor() {
    this.pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const [rows] = await this.pool.execute(
        'SELECT user_id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );

      const users = rows as User[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async createUser(name: string, email: string, password_hash: string): Promise<User> {
    try {
      const [result] = await this.pool.execute(
        'INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [name, email, password_hash]
      );

      const insertResult = result as mysql.ResultSetHeader;
      const userId = insertResult.insertId;

      // Fetch the created user
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async findUserById(userId: number): Promise<User | null> {
    try {
      const [rows] = await this.pool.execute(
        'SELECT user_id, name, email, password_hash, created_at, updated_at FROM users WHERE user_id = ?',
        [userId]
      );

      const users = rows as User[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async closePool(): Promise<void> {
    await this.pool.end();
  }
}

export default DatabaseService;