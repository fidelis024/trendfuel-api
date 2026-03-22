import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate =
  (schema: AnyZodObject) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'), // strip leading 'body'/'params'
          message: e.message,
        }));
        next(ApiError.badRequest('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
