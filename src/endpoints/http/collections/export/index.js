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
 * @param {String[]} collectionNames - Array of collection names.
 * @returns Promise
 */
function getCollectionsSize(db, collectionNames) {
  return Promise.all(collectionNames.map(name => getCollectionSizeOne(db, name))).then(getTotalSize);
}

/**
 * Sum an array of Numbers.
 *
 * @param {Number[]} sizes - Number array containing sizes.
 * @returns {Number} - sum of all the sizes.
 */
function getTotalSize(sizes) {
  return sizes.reduce((acc, size) => acc + size, 0);
}

/**
 * Gets the associated stream for all collections.
 *
 * @param {String} collections - String array of all collection names.
 * @param {db} db - db connection.
 * @param {String} format - The requested format to export the collections.
 * @param {Boolean} raw - true for a collection's documents to be returned in bson format, false for json.
 * @param {object} query - A query to run on the collection before export.
 * @returns {Stream[]} - An array of streams containing each collection's documents.
 */
function getCollectionStreams(collections, db, format, raw, query) {
  return collections.map(name => {
    const collection = db.collection(name);
    const cursor = collection.find(query, { raw: raw });
    cursor.filename = `${name}.${format}`;
    return cursor.stream();
  });
}

/**
 * Assigns parser streams for each collection.
 *
 * @param {Stream} streams - An array of streams containing each collection's documents.
 * @param {String} format - The requested format to export the collections.
 * @returns {Promise[]} - An array of promises that resolve to streams containing each collection's documents parsed in the requested format.
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

function isValidExportSize(db, collectionNames) {
  const sizeLimit = fhconfig.value('sizeLimit');
  if (!sizeLimit) {
    return Promise.resolve(true);
  }

  return getCollectionsSize(db, collectionNames)
    .then(collectionsSize => collectionsSize <= sizeLimit);
}

/**
 * Create a human readable size with units from bytes.
 *
 * @param {Number} bytes - The size in bytes.
 * @returns {String} - Human readable size with units.
 */
function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1000;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Exports collection(s) for a given app.
 *
 * @param {db} db - The db connection.
 * @param {String} reqCollections - The String array of collections requested to export.
 * @param {object} options - Export options
 * @param {String} options.format - The requested format to export the collections to. Supports bson, json and csv.
 * @param {object} [options.mongoQuery] - A query to run on the collection before export.
 * @param {Stream} out - Response stream containing the zip file.
 * @returns Promise.
 */
function exportHandler(db, collectionNames, options, out) {
  const {format, mongoQuery={}} = options;
  return isValidExportSize(db, collectionNames)
    .then(validSize => {
      if (!validSize) {
        const humanReadableSize = formatBytes(fhconfig.value('sizeLimit'));
        return Promise.reject(new Error(`Cannot export collections larger than ${humanReadableSize}`));
      }

      const streams = getCollectionStreams(collectionNames, db, format, format === 'bson', mongoQuery);
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
 * @param {object} options - Export options
 * @param {String} options.format - The requested format to export the collections. Supports bson, json and csv.
 * @param {object} [options.mongoQuery] - A query to run on the collection before export.
 * @param {Stream} out - The output stream of the zip entries.
 * @returns Promise
 */
export default function exportCollections(db, reqCollections, options, out) {
  if (!reqCollections.length) {
    return getAllCollectionNames(db)
      .then(collectionNames => exportHandler(db, collectionNames, options, out));
  }

  return exportHandler(db, reqCollections, options, out);
}
