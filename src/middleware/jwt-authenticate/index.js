import _ from 'lodash';
import jwt from 'jsonwebtoken';
import UnauthorizedError from './UnauthorizedError';

/**
 * Middleware for authenticating requests based on JSON Web Tokens.
 *
 * @param {object} options - Options for the middleware.
 * @param {string} options.secret - Secret key to use for verifying JSON web token.
 * @param {string} [options.payloadPath=user] - Decoded JSON web token payload will be attached to request[payloadPath].
 *                                              Uses 'lodash.set' syntax. Defaults to 'user'.
 */
export default (options={}) => {

  if (!options.secret) {
    throw new Error('Authentication module options.secret parameter is required');
  }

  function middleware(req, res, next) {
    const authorization = Object.assign(req.body || {}, req.query || {}, req.headers || {}).authorization;
    if (!authorization) {
      return next(new UnauthorizedError('Authorisation has not been set'));
    }

    const [schema='', token=''] = authorization.split(' ');
    if (schema !== 'Bearer' || !token) {
      return next(new UnauthorizedError('Authorisation should use "Bearer <token>" schema'));
    }

    jwt.verify(token, options.secret, (err, payload) => {
      if (err) {
        return next(new UnauthorizedError(err.message));
      }

      _.set(req, options.payloadPath || 'user', payload);

      next(null);
    });
  }

  return middleware;
};
