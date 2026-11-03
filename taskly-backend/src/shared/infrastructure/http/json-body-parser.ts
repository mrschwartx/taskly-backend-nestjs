import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { RequestBodyError } from './request-body-error.js';

const translate = (error: unknown): unknown => {
  const type = (error as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    return new RequestBodyError('Malformed JSON body', 400);
  }
  if (type === 'entity.too.large') {
    return new RequestBodyError('Request body is too large', 413);
  }
  return error;
};

export const createJsonBodyParser = () => {
  const parser = express.json();
  return (request: Request, response: Response, next: NextFunction): void => {
    parser(request, response, (error?: unknown) =>
      next(error ? translate(error) : undefined),
    );
  };
};
