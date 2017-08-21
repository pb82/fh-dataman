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
 * The environment variables are used to discover if the app has a dedicated or shared mongo database.
 *
 * @param {object} req - The request object.
 * @param {object} result - The result from getMbaasClient
 * @param {function} cb - The callback that handles the response.
 *
 */
function getAppEnvVars(req, result, cb) {
  const {domain, envId, appGuid} = req.params;
  const appname = `${domain}-${appGuid}-${envId}`;
  result.appname = appname;
  result.appId = {domain, environment: envId, appname};
  result.mbaasClient.admin.apps.envVars.get(result.appId, (err, resp) => {
    if (err) {
      return cb(err);
    }

    result.appEnvVars = resp.env || {};
    req.log.debug({appEnvVars: result.appEnvVars}, 'got env vars');
    cb(null, result);
  });
}

/**
 * Prepare the options to connect the database.
 * If the app has a dedicated database FH_MONGODB_CONN_URL should exist in app environment variable
 * and can be used as connection url.
 * If the app has a shared database ditch options will be used to retrieve connection url.
 *
 * @param {object} options
 * @param {object} options.ditch - options for ditch.
 * @param {object} result - The result from getAppEnvVars.
 * @param {function} cb - The callback that handles the response.
 *
 */
function prepareMongoOptions(options, result, cb) {
  const mongoOptions = {
    environment: result.appId.environment,
    domain: result.appId.domain,
    appname: result.appname,
    data: {}
  };
  const appEnvVars = result.appEnvVars;
  mongoOptions.isDedicatedDb = !!(appEnvVars.FH_MONGODB_CONN_URL);
  if (mongoOptions.isDedicatedDb) {
    mongoOptions.primaryNodeUrl = appEnvVars.FH_MONGODB_CONN_URL;
  } else {
    mongoOptions.data.host = options.ditch.host;
    mongoOptions.data.port = options.ditch.port;
  }

  result.mongoOptions = mongoOptions;
  cb(null, result);
}

/**
 * A shared apps database will be part of a mongo replica set.
 * ditch options may not point to the primary node so we must query the mbaas to get the primary node.
 * Only makes a request if the app has a shared database
 *
 * @param {object} options
 * @param {object} options.ditch - options for ditch.
 * @param {object} result - The result from prepareMongoOptions.
 * @param {function} cb - The callback that handles the response.
 *
 */
function getMongoPrimaryNode(options, result, cb) {
  if (result.mongoOptions.isDedicatedDb) {
    return cb(null, result);
  }

  result.mbaasClient.admin.apps.mongoPrimary(result.mongoOptions, function(err, mongoPrimary) {
    if (err) {
      return cb(err);
    }

    const {user, password, database} = options.ditch;
    result.mongoOptions.primaryNodeUrl = `mongodb://${user}:${password}@${mongoPrimary.host}:${mongoPrimary.port}/${database}`;

    cb(null, result);
  });
}

/**
 * Format params into the correct format for fh-db.createMongoCompatApi
 *
 * @param {object} result - The result from getMongoPrimaryNode.
 * @param {function} cb - The callback that handles the response.
 *
 */
function formatMongoConnectionParams(result, cb) {
  result.connectionParams = {
    __dbperapp: result.mongoOptions.isDedicatedDb,
    connectionUrl: result.mongoOptions.primaryNodeUrl,
    __fhdb: result.appname
  };
  cb(null, result);
}

/**
* Retrieve the configuration to connect to the mongo db for this app.
*
* @param {object} options
* @param {object} options.mbaas - options for the current mbaas
* @param {object} options.ditch - ditch options for shared db connections
* @param {Object} req
*
* @returns {Promise}
*/
function getMongoConf(options, req) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      async.apply(getMbaasClient, options, req),
      async.apply(getAppEnvVars, req),
      async.apply(prepareMongoOptions, options),
      async.apply(getMongoPrimaryNode, options),
      formatMongoConnectionParams
    ],
    (err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result.connectionParams);
    });
  });
}

export {getMongoConf};
