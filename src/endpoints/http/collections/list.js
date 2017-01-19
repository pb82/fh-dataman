/**
 * Get the collection list and their info (including the namespace, name, count and size). Returns a promise.
 * @param {string} appname The appname. It should be in the format of "<domain>-<appGuid>-<envId>".
 * @param {object} logger The logger object
 * @param {db} the db connection
 * @returns Promise
 */
export default function listCollectionsInfo(appname, logger, db) {
  logger.debug({appname: appname}, "list collections for app");
  return db.listCollections().toArray().then(items => {
    const promises = items.map(item => db.collection(item.name).stats());
    return Promise.all(promises);
  }).then(stats => stats.map(stat => ({
    'ns': stat.ns,
    'name': stat.ns.split('.')[1],
    'count': stat.count,
    'size': stat.size
  })));
}