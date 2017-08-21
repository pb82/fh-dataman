import _ from 'lodash';
import fhconfig from 'fh-config';

function getRouteData(req) {
  return [
    _.get(req, 'user.permissions', []),
    _.get(req, 'params.appGuid', 'appGuid'),
    _.get(req, 'user.entity.guid', 'entityGuid')
  ];
}

function hasValidBusinessObject(permissionsList, permission) {
  const routeBusinessObjects = fhconfig.value('businessObjects');
  return permissionsList.some(p => routeBusinessObjects.indexOf(p.businessObject) > -1 && p.permissions[permission]);
}

function appHasPermission(appGuid, entityGuid) {
  return appGuid === entityGuid;
}

/**
 * Responsible for checking whether permissions are correct.
 *
 * @param {Object} req - The route request object containing granted permissions.
 * @param {string} permission - The permission for the route e.g. 'read', 'write'
 * @param {function} cb - Callback function.
 */
export default function(req={}, permission='', cb) {
  if (typeof cb !== 'function') {
    throw new Error('cb must be a function');
  }

  const [permissionsList, appGuid, entityGuid] = getRouteData(req);
  const validPermission = appHasPermission(appGuid, entityGuid) && hasValidBusinessObject(permissionsList, permission);

  cb(validPermission);
}
