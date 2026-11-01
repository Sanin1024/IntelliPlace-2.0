// Challenge 215, 217: Async Handler Wrapper
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps asynchronous Express controllers, catching any rejected promises
 * and passing the error directly to the next() error handler middleware.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

