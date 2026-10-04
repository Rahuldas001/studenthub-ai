import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';

/**
 * Wraps an async route handler so rejected promises reach the error middleware
 * instead of becoming unhandled rejections.
 *
 * Generic over the route params: Express types `/:id` as `{ id: string }`, and
 * without this the wrapper would widen every handler to the default param map
 * and reject param-typed controllers.
 *
 * The default is declared locally rather than imported: `ParamsDictionary` was
 * removed from `@types/express` v5, and express's own default param map is
 * structurally identical for our routes.
 */
export function asyncHandler<P = Record<string, string>>(
  handler: (
    req: Request<P>,
    res: Response,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler<P> {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}