/**
 * Creates a collection for a given app.
 *
 * @param {String} appname The appname. It should be in the format of "<domain>-<appGuid>-<envId>".
 * @param {object} logger The logger object.
 * @param {db} db The db connection.
 * @param {String} name The name of the collection to be created.
 * @returns Promise
 */
export default function createCollection(appname, logger, db, name) {
  logger.debug({appname}, ' creating new collection ', {name});
  return new Promise((resolve, reject) => {
    return db.createCollection(name, err => {
      return err ? reject(err) : resolve(name);
    });
  });
}
