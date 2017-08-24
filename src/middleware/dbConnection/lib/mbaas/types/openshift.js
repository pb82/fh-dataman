import fhMbaasClient from 'fh-mbaas-client';
import async from 'async';

/**
 * Create a new fhMbaasClient instance.
 *
 * @param {object} options
 * @param {object} options.mbaas - options for the current mbaas
 * @param {string} req.params.envId - The environment the app is deployed to.
 * @param {function} cb - The callback that handles the response.
 *
 */
function getMbaasClient(options, req, cb) {
  const mbaasClient = new fhMbaasClient.MbaasClient(req.params.envId, options.mbaas);
  cb(null, {mbaasClient});
}

/**
 * Get the app environment variables for this app.
 * The environment variables contain env access key and app API key.
 *
 * @param {string} servicekey - The mbaas service key
 * @param {object} req - The request object.
 * @param {object} result - The result from getMbaasClient
 * @param {function} cb - The callback that handles the response.
 *
 */
function getAppEnvVars(servicekey, req, result, cb) {
  const {domain, envId, appGuid} = req.params;
  result.mbaasClient.admin.apps.envVars.get({
    domain,
    servicekey,
    environment: envId,
    appname: appGuid
  }, (err, resp) => {
    if (err) {
      return cb(err);
    }

    result.appEnvVars = resp.env || {};
    cb(null, result);
  });
}

/**
 * Get the app mongo connection conf from fh-mbaas.
 *
 * @param {object} req - The request object.
 * @param {object} result - The result from getAppEnvVars.
 * @param {function} cb - The callback that handles the response.
 *
 */
function getAppDbMongoConnection(req, result, cb) {
  const {domain, envId, appGuid} = req.params;
  result.mbaasClient.app.databaseConnectionString({
    domain: domain,
    environment: envId,
    project: 'fh-dataman',
    app: appGuid,
    accessKey: result.appEnvVars.FH_MBAAS_ENV_ACCESS_KEY,
    appApiKey: result.appEnvVars.FH_APP_API_KEY,
    url: 'fh-dataman'
  }, (err, res) => {
    if (err) {
      return cb(err);
    }

    return cb(null, {__dbperapp: true, connectionUrl: res.url});
  });
}

/**
* Retrieve the configuration to connect to the mongo db for this app.
*
* @param {object} options
* @param {object} options.mongo - options for the mongo db
* @param {string} options.auth.secret - accessKey to get mongo connection url from fh-mbaas.
* @param {Object} req
*
* @returns {Promise}
*/
function getMongoConf(options, req) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      async.apply(getMbaasClient, options, req),
      async.apply(getAppEnvVars, options.auth.secret, req),
      async.apply(getAppDbMongoConnection, req)
    ],
    (err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result);
    });
  });
}

export {getMongoConf};
