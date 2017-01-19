/**
 * Deletes collection(s) for a given app.
 *
 * @param {String} appname The appname. It should be in the format of "<domain>-<appGuid>-<envId>".
 * @param {object} logger The logger object.
 * @param {db} db The db connection.
 * @param {String[]} collections The array of collection name(s) to be deleted.
 * @returns Promise
 */
export default function deleteCollections(appname, logger, db, collections) {
  logger.debug({appname}, 'deleting collection(s)');
  const promises = collections.map(function(collection) {
    return new Promise(function(resolve, reject) {
      return db.getCollection(collection).drop() ? resolve(collection) : reject(collection);
    });
  });
  return Promise.all(promises);
}