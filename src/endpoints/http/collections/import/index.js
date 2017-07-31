import * as storage from './mongoStream';
import statusCodes from 'http-status-codes';

/**
 * Derive a collection name from a file name.
 *
 * @param {String} fileName - The name of the file.
 *
 * @returns {string} collection name
 */
export function getCollectionName(fileName) {
  const collectionName = fileName.split('.');
  collectionName.pop();
  return collectionName.join('.');
}

/**
 * Derive collection names from a collection files.
 *
 * @param {Filestream[]} files
 *
 * @returns {String[]} collection names
 */
export function getCollectionNames(files) {
  return files.map(file => getCollectionName(file.meta.fileName));
}

/**
 * Check for whether the proposed collection name already exists.
 *
 * @param {Array} collections - List of current collections in the db.
 * @param {string} name - The proposed collection name.
 *
 * @returns {Boolean} - Whether collection name is already a collection in the db.
 */
function collectionExists(collections, name) {
  return collections.some(collection => collection.name === name);
}

/**
 * Insert the file contents into the database as collection 'name'.
 * file contents are expected to be compatible with mongodb insert interface.
 *
 * @param {object} file - ReadStream to read the file data from.
 * @param {string} name - The proposed collection name.
 * @param {object} db - The mongodb connection.
 *
 * @returns {Promise}
 */
export function insertCollection(file, name, db) {

  return new Promise((resolve, reject) => {
    const insert = new storage.InsertStream({db: db, collectionName: name});

    db.listCollections()
      .toArray((err, collections) => {
        if (err || collectionExists(collections, name)) {
          return reject(err || {message: `Collection ${name} already exists`, code: statusCodes.CONFLICT});
        }

        file
          .pipe(insert)
          .on('finish', () => resolve(name))
          .on('error', err => {
            err.collectionName = name;
            reject(err);
          });
      });
  });
}

/**
 * Insert all the files contents into the database as getCollectionName.
 * file contents are expected to be compatible with mongodb insert interface.
 *
 * @param {Filestream[]} files - Array of ReadStreams to read the file data from.
 * @param {object} db - The mongodb connection.
 *
 * @returns {Promise}
 */
export function insertCollections(files, db) {
  return Promise.all(files.map(file => insertCollection(file, getCollectionName(file.meta.fileName), db)));
}
