/**
 * Deletes collection(s) for a given app.
 *
 * @param {String} appname The appname. It should be in the format of "<domain>-<appGuid>-<envId>".
 * @param {object} logger The logger object.
 * @param {db} db The db connection.
 * @param {String[]} collections The array of collection name(s) to be deleted.
 * @returns Promise
 */
export default function deleteCollections(appname, logger, db, collection) {
  logger.debug({appname}, 'deleting collection(s)');
  return db.dropCollection(collection);
}