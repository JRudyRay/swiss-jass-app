import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'swiss-jass-development-secret';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatarShape?: string;
  avatarColor?: string;
  country?: string;
  city?: string;
}

export interface LoginData {
  emailOrUsername: string;
  password: string;
}

export class AuthService {
  
  static async register(userData: RegisterData) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new Error('User with this email already exists');
      }
      if (existingUser.username === userData.username) {
        throw new Error('Username is already taken');
      }
    }

    // Validate password strength
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        username: userData.username,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatarShape: userData.avatarShape || 'circle',
        avatarColor: userData.avatarColor || '#3B82F6',
        country: userData.country || 'CH',
        city: userData.city
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  static async login(loginData: LoginData) {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginData.emailOrUsername.toLowerCase() },
          { username: loginData.emailOrUsername }
        ]
      }
    });

    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(loginData.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email/username or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarShape: true,
        avatarColor: true,
        country: true,
        city: true,
  totalGames: true,
  totalWins: true,
  totalPoints: true,
  trueSkillMu: true,
  trueSkillSigma: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static async updateProfile(userId: string, updateData: Partial<RegisterData>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatarShape: updateData.avatarShape,
        avatarColor: updateData.avatarColor,
        city: updateData.city
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarShape: true,
        avatarColor: true,
        country: true,
        city: true,
  totalGames: true,
  totalWins: true,
  totalPoints: true,
  trueSkillMu: true,
  trueSkillSigma: true
      }
    });

    return user;
  }

  static getAvailableAvatars() {
    return {
      shapes: [
        { id: 'circle', name: 'Circle', emoji: '⭕' },
        { id: 'square', name: 'Square', emoji: '🔲' },
        { id: 'triangle', name: 'Triangle', emoji: '🔺' },
        { id: 'diamond', name: 'Diamond', emoji: '🔶' },
        { id: 'star', name: 'Star', emoji: '⭐' },
        { id: 'heart', name: 'Heart', emoji: '❤️' }
      ],
      colors: [
        '#3B82F6', // Blue
        '#EF4444', // Red
        '#10B981', // Green
        '#F59E0B', // Yellow
        '#8B5CF6', // Purple
        '#F97316', // Orange
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#EC4899', // Pink
        '#6B7280'  // Gray
      ]
    };
  }
}