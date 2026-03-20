import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import logger from '../utils/logger';

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (error instanceof ApiError) {
    return res
      .status(error.statusCode)
      .json(
        new ApiResponse(
          error.statusCode,
          error.message,
          undefined,
          error instanceof ApiError ? [] : undefined
        )
      );
  }

  return res.status(500).json(new ApiResponse(500, 'Internal Server Error'));
};

export default errorHandler;
