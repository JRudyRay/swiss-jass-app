import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import gameRoutes from './routes/games';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.user.count();
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'connected',
      features: [
        'user-authentication',
        'database-storage',
        'avatar-system',
        'game-engine',
        'real-time-multiplayer'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎯 Swiss Jass - Complete Authentication System',
    version: '2.0.0',
    endpoints: {
      authentication: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        avatars: 'GET /api/auth/avatars',
        verify: 'POST /api/auth/verify'
      },
      games: {
        create: 'POST /api/games/create',
        join: 'POST /api/games/:id/join',
        state: 'GET /api/games/:id'
      }
    },
    features: [
      '✅ User Registration & Login',
      '✅ Secure Password Hashing',
      '✅ JWT Token Authentication', 
      '✅ Database Storage (SQLite)',
      '✅ Avatar System (Shapes & Colors)',
      '✅ Profile Management',
      '✅ Swiss Jass Ready'
    ]
  });
});

// User avatar endpoint
app.get('/api/user/:userId/avatar', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { avatarShape: true, avatarColor: true, username: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate SVG avatar
    const avatarSvg = `
      <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .avatar-shape { fill: ${user.avatarColor}; stroke: #fff; stroke-width: 2; }
            .avatar-text { fill: #fff; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
          </style>
        </defs>
        ${getShapeSvg(user.avatarShape, 30, 30, 25)}
        <text x="30" y="35" class="avatar-text">${user.username.charAt(0).toUpperCase()}</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(avatarSvg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate avatar' });
  }
});

function getShapeSvg(shape: string, x: number, y: number, size: number): string {
  switch (shape) {
    case 'circle':
      return `<circle cx="${x}" cy="${y}" r="${size}" class="avatar-shape"/>`;
    case 'square':
      return `<rect x="${x-size}" y="${y-size}" width="${size*2}" height="${size*2}" class="avatar-shape"/>`;
    case 'triangle':
      return `<polygon points="${x},${y-size} ${x-size},${y+size} ${x+size},${y+size}" class="avatar-shape"/>`;
    case 'diamond':
      return `<polygon points="${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}" class="avatar-shape"/>`;
    case 'star':
      const points = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 144 - 90) * Math.PI / 180;
        const outerX = x + Math.cos(angle) * size;
        const outerY = y + Math.sin(angle) * size;
        points.push(`${outerX},${outerY}`);
        
        const innerAngle = ((i + 0.5) * 144 - 90) * Math.PI / 180;
        const innerX = x + Math.cos(innerAngle) * (size * 0.4);
        const innerY = y + Math.sin(innerAngle) * (size * 0.4);
        points.push(`${innerX},${innerY}`);
      }
      return `<polygon points="${points.join(' ')}" class="avatar-shape"/>`;
    case 'heart':
      return `<path d="M${x},${y+size*0.3} C${x-size*0.7},${y-size*0.3} ${x-size},${y} ${x-size*0.5},${y+size*0.5} L${x},${y+size} L${x+size*0.5},${y+size*0.5} C${x+size},${y} ${x+size*0.7},${y-size*0.3} ${x},${y+size*0.3}" class="avatar-shape"/>`;
    default:
      return `<circle cx="${x}" cy="${y}" r="${size}" class="avatar-shape"/>`;
  }
}

// Database stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    res.json({
      success: true,
      statistics: {
        totalUsers: userCount,
        newUsersThisWeek: recentUsers,
        databaseConnected: true
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Simple WebSocket handling
io.on('connection', (socket: any) => {
  console.log('🔌 Player connected:', socket.id);
  
  socket.emit('welcome', {
    message: '🇨🇭 Welcome to Swiss Jass!',
    playerId: socket.id
  });

  socket.on('disconnect', () => {
    console.log('🔌 Player disconnected:', socket.id);
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('🎯 =====================================');
  console.log('🇨🇭 SWISS JASS - AUTHENTICATION READY');
  console.log('🎯 =====================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/`);
  console.log('');
  console.log('🔐 Authentication Endpoints:');
  console.log('   • POST /api/auth/register');
  console.log('   • POST /api/auth/login');
  console.log('   • GET /api/auth/profile');
  console.log('   • PUT /api/auth/profile');
  console.log('   • GET /api/auth/avatars');
  console.log('');
  console.log('✅ Ready for frontend connection!');
  console.log('');
});