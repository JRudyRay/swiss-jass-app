const DEV_SECRET = 'swiss-jass-development-secret';

// In production a missing JWT_SECRET is fatal: the dev fallback is public.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

export const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
