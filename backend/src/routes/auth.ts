import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/authService';
import { validate } from '../validate';

const router = Router();

// Middleware to verify token
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Register new user
const optText = (f: string, max = 60) =>
  body(f)
    .optional({ nullable: true })
    .isString()
    .withMessage('must be text')
    .isLength({ max })
    .withMessage('too long');

router.post(
  '/register',
  body('email').isString().trim().isEmail().isLength({ max: 254 }).withMessage('must be an email'),
  body('username').isString().trim().isLength({ min: 2, max: 30 }).withMessage('2-30 characters'),
  body('password').isString().isLength({ min: 6, max: 200 }).withMessage('6-200 characters'),
  optText('firstName'),
  optText('lastName'),
  optText('avatarShape'),
  optText('avatarColor'),
  optText('country'),
  optText('city'),
  validate,
  async (req, res) => {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to Swiss Jass!',
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// Login user
router.post(
  '/login',
  body('emailOrUsername').isString().isLength({ min: 1, max: 254 }).withMessage('required'),
  body('password').isString().isLength({ min: 1, max: 200 }).withMessage('required'),
  validate,
  async (req, res) => {
    try {
      const result = await AuthService.login(req.body);
      res.json({
        success: true,
        message: 'Login successful! Welcome back!',
        ...result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// Get current user profile
router.get('/profile', authenticateToken, async (req: any, res) => {
  try {
    const user = await AuthService.getUserProfile(req.user.userId);
    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

// Update user profile
router.put(
  '/profile',
  authenticateToken,
  optText('firstName'),
  optText('lastName'),
  optText('avatarShape'),
  optText('avatarColor'),
  optText('city'),
  validate,
  async (req: any, res) => {
    try {
      const user = await AuthService.updateProfile(req.user.userId, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully!',
        user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// Get available avatar options
router.get('/avatars', (req, res) => {
  try {
    const avatars = AuthService.getAvailableAvatars();
    res.json({
      success: true,
      avatars,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify token endpoint
router.post(
  '/verify',
  body('token').isString().isLength({ min: 1, max: 2000 }).withMessage('required'),
  validate,
  async (req, res) => {
    try {
      const { token } = req.body;
      const decoded = AuthService.verifyToken(token);
      const user = await AuthService.getUserProfile(decoded.userId);

      res.json({
        success: true,
        valid: true,
        user,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        valid: false,
        message: error.message,
      });
    }
  },
);

export default router;
