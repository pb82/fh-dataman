import parsers from './lib/parser';
import archive from './lib/archive';
import fhconfig from 'fh-config';

/**
 * Gets the size of a collection.
 *
 * @param {db} db - The db connection.
 * @param {String} collectionName - The name of the collection requested to get the size of.
 * @returns Promise
 */
function getCollectionSizeOne(db, collectionName) {
  return new Promise((resolve, reject) => {
    db.collection(collectionName).stats((err, stats) => {
      if (err) {
        return reject(err.message === 'ns not found' ? new Error(`${collectionName} collection does not exist`) : err);
      }

      resolve(stats.size);
    });
  });
}

/**
 * Gets the size of all collections.
 *
 * @param {db} db - The db connection.
 * @param {String} collectionNames - The String array of collections requested to export.
 * @returns Promise
 */
function getCollectionsSize(db, collectionNames) {
  return Promise.all(collectionNames.map(name => getCollectionSizeOne(db, name))).then(getTotalSize);
}

/**
 * Gets the total size of all collections.
 *
 * @param {Number} sizes - Number array containing each collections size.
 * @returns {Number} - sum of all the collection sizes.
 */
function getTotalSize(sizes) {
  return sizes.reduce((acc, size) => acc + size, 0);
}

/**
 * Gets documents for all collections.
 *
 * @param {String} collections - String array of all collection names.
 * @param {db} db - db connection.
 * @param {String} format - The requested format to export the collections.
 * @param {Boolean} raw - true for a collection's documents to be returned in bson format, false for json.
 * @returns {Stream} - An array of streams containing each collection's documents.
 */
function getCollectionStreams(collections, db, format, raw) {
  return collections.map(name => {
    const collection = db.collection(name);
    const cursor = collection.find({}, { raw: raw });
    cursor.filename = `${name}.${format}`;
    return cursor.stream();
  });
}

/**
 * Parses all collections in the requested format.
 *
 * @param {Stream} streams - An array of streams containing each collection's documents.
 * @param {String} format - The requested format to export the collections.
 * @returns {Stream} - An array of streams containing each collection's documents parsed in the requested format.
 */
function setParsers(streams, format) {
  return streams.map(collection => parsers[format](collection));
}

/**
 * Pipe's the zip file out to a writeable stream to be downloaded.
 *
 * @param {Stream} zipFile - A zip file stream containing each collection's documents parsed in the requested format.
 * @param {Stream} out - Response stream containing the zip file.
 * @returns {Promise}
 */
function exportZip(zipFile, out) {
  return new Promise((resolve, reject) => {
    zipFile
      .pipe(out)
      .on('finish', resolve)
      .on('error', reject);
  });
}

/**
 * Exports collection(s) for a given app.
 *
 * @param {db} db - The db connection.
 * @param {String} reqCollections - The String array of collections requested to export.
 * @param {String} format - The requested format to export the collections. Supports bson, json and csv.
 * @param {Stream} out - Response stream containing the zip file.
 * @returns Promise.
 */
function exportHandler(db, collectionNames, format, out) {
  return getCollectionsSize(db, collectionNames)
    .then(collectionsSize => {
      if (collectionsSize >= fhconfig.value('sizeLimit')) {
        throw new Error("Cannot export collections larger than a gigabyte");
      }
      const streams = getCollectionStreams(collectionNames, db, format, format === 'bson');
      const parsedCollections = setParsers(streams, format);
      return Promise.all(parsedCollections);
    })
    .then(collections => archive(collections))
    .then(zipFile => exportZip(zipFile, out));
}

/**
 * Gets all collection names.
 *
 * @param {db} db - db connection.
 * @returns {Promise}
 */
function getAllCollectionNames(db) {
  return db
    .listCollections()
    .toArray()
    .then(collections => collections.map(collection => collection.name.split('.').pop()))
    .then(names => names.filter(name => name !== 'indexes' & name !== 'users'));
}

/**
 * Invokes exportHandler with requested collections or else all collections.
 *
 * @param {db} db - The db connection.
 * @param {String} reqCollections - The String array of collections requested to export.
 * @param {String} format - The requested format to export the collections. Supports bson, json and csv.
 * @param {Stream} out - The output stream of the zip entries.
 * @returns exportHandler - function to handle the exporting of collections.
 */
export default function exportCollections(db, reqCollections, format, out) {
  if (!reqCollections.length) {
    return getAllCollectionNames(db)
      .then(collectionNames => exportHandler(db, collectionNames, format, out));
  }
  return exportHandler(db, reqCollections, format, out);
}
