import { Request, Response } from 'express';
import { DatabaseService } from '../services/dbService';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const db = DatabaseService.getInstance();
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const password_hash = await hashPassword(password);
    const user = await db.createUser(name, email, password_hash);

    const token = generateToken(user.user_id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  console.log('🔐 AuthController.login - Starting login process');
  try {
    const { email, password } = req.body;
    console.log(`🔐 AuthController.login - Login attempt for email: ${email}`);
    console.log(`🔐 AuthController.login - Password received: ${password ? 'Yes' : 'No'}`);

    if (!email || !password) {
      console.log('🔐 AuthController.login - Missing email or password');
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    console.log('🔐 AuthController.login - Searching for user in database using raw SQL');
    const db = DatabaseService.getInstance();
    let user;
    try {
      user = await db.findUserByEmail(email);
      console.log('🔐 AuthController.login - Raw SQL query completed');
    } catch (dbError) {
      console.error('🔐 AuthController.login - Database error:', dbError);
      throw dbError;
    }

    if (!user) {
      console.log('🔐 AuthController.login - User not found');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log(`🔐 AuthController.login - User found: ${user.name}`);
    console.log(`🔐 AuthController.login - User ID: ${user.user_id}`);
    console.log(`🔐 AuthController.login - User password_hash exists: ${user.password_hash ? 'Yes' : 'No'}`);
    console.log(`🔐 AuthController.login - User password_hash length: ${user.password_hash?.length || 0}`);

    console.log('🔐 AuthController.login - About to verify password');
    let isPasswordValid;
    try {
      isPasswordValid = await comparePassword(password, user.password_hash);
      console.log(`🔐 AuthController.login - Password comparison completed: ${isPasswordValid}`);
    } catch (passwordError) {
      console.error('🔐 AuthController.login - Password comparison error:', passwordError);
      throw passwordError;
    }

    if (!isPasswordValid) {
      console.log('🔐 AuthController.login - Invalid password');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('🔐 AuthController.login - Password valid, generating token');
    let token;
    try {
      token = generateToken(user.user_id);
      console.log('🔐 AuthController.login - Token generated successfully');
    } catch (tokenError) {
      console.error('🔐 AuthController.login - Token generation error:', tokenError);
      throw tokenError;
    }

    console.log('🔐 AuthController.login - Login successful, sending response');
    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('🔐 AuthController.login - Error occurred:', error);
    console.error('🔐 AuthController.login - Error stack:', (error as Error).stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};