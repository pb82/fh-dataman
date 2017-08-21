import hasPermission from './permission';
import ForbiddenError from './ForbiddenError';

/**
 * Middleware for adding permission checks on a route.
 *
 * @param {Object} options - Options object.
 * @param {string} [options.permission] - The permission access which defines the access the user has for this permission. e.g. 'read', 'write'
 *                                        Falls back on permissions based on ReST verbs.
 */
function authorize(options={}) {

  return (req, res, next) => {
    const permission = options.permission || (req.method === 'GET' ? 'read' : 'write');
    hasPermission(req, permission, value => {
      next(value ? null : new ForbiddenError());
    });
  };
}

export default authorize;
