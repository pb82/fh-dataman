/**
 * A few util functions for operations on mongodb
 */
import async from 'async';
import {MongoClient} from  'mongodb';
const MONGO_SERVER = process.env.MONGO_SERVER || 'localhost';
const MONGO_ADMIN_USER = process.env.MONGO_ADMIN_USER || 'admin';
const MONGO_ADMIN_PASS = process.env.MONGO_ADMIN_PASS || 'admin';
const MONGO_ADMIN_DB_URL = `mongodb://${MONGO_ADMIN_USER}:${MONGO_ADMIN_PASS}@${MONGO_SERVER}/admin`;
const MONGO_USER = "test";
const MONGO_PASS = "password";
const MONGO_DB_NAME = "fh-dataman-test";
const MONGODBURL = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_SERVER}/${MONGO_DB_NAME}`;

exports.MONGODBURL = MONGODBURL;

/**
 * Create the test mongodb
 */
export function setupDb(cb) {
  MongoClient.connect(MONGO_ADMIN_DB_URL, (err, db) => {
    if (err) {
      return cb(err);
    }
    var testDb = db.db(MONGO_DB_NAME);
    testDb.addUser(MONGO_USER, MONGO_PASS).then(() => cb(null, testDb)).catch(err => cb(err));
  });
}

/**
 * Connect to the test mongodb
 */
export function connectDb(cb) {
  MongoClient.connect(MONGODBURL, cb);
}

/**
 * Delete the test mongodb
 */
export function dropDb(cb) {
  MongoClient.connect(MONGODBURL, (err, db) => {
    if (err) {
      return cb(err);
    }
    db.dropDatabase(cb);
  });
}

/**
 * Populate the mongodb with given collections & documents.
 * sample collections:
 * [{name: 'test1', docs: [{field1: 'field1}]}]
 */
export function createCollectionsWithDocs(collections, cb) {
  connectDb((err, db) => {
    if (err) {
      return cb(err);
    }
    async.each(collections, function(col, colCb) {
      db.collection(col.name, (err, collection) => {
        if (err) {
          return colCb(err);
        }
        collection.insertMany(col.docs, colCb);
      });
    }, function(err) {
      return cb(err);
    });
  });
}

export function getCollectionNames(cb) {
  connectDb((err, db) => {
    if (err) {
      return cb(err);
    }

    var testDb = db.db(MONGO_DB_NAME);
    testDb.listCollections().toArray(function(err, items) {
      cb(items.map(item => item.name), testDb);
    });
  });
}

export function dropCollection(collection, cb) {
  connectDb((err, db) => {
    if (err) {
      return cb(err);
    }

    var testDb = db.db(MONGO_DB_NAME);
    testDb.dropCollection(collection).then(() => cb(null, testDb)).catch(err => cb(err));
  });
}
