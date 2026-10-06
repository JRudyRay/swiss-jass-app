import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

// Ends the request with 400 when any preceding express-validator check failed.
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0] as any;
  return res.status(400).json({
    success: false,
    message: `Invalid ${first.path ?? 'input'}: ${first.msg}`,
  });
}
