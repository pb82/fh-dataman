import InsertReceivedBufferError from './InsertReceivedBufferError';

/**
 * Utility to insert data into the mongodb collection
 *
 * @param {object|Array} data - The data object(s).
 * @param {string} fn - The mongodb collection insert function name
 * @param {function} cb - The callback function.
 *
 */
function insert(data, fn, cb) {
  if (data instanceof Buffer) {
    return this.emit('error', new InsertReceivedBufferError());
  }

  if (this.collection) {
    return this.collection[fn](data, cb);
  }

  this.db.collection(this.collectionName, function(err, collection) {
    if (err) {
      return this.emit('error', err);
    }

    this.collection = collection;
    collection[fn](data, cb);
  }.bind(this));
}

/**
 * Mixin implementing the WriteStream interface.
 * InsertMixin will insert object(s) into a mongodb collection.
 *
 */
var InsertMixin = Base => class extends Base {

  constructor(options={}) {
    if (!options.db || !options.collectionName) {
      throw new Error('Can not initialise without db or collectionName option');
    }

    super(options);
    this.db = options.db;
    this.collectionName = options.collectionName;
  }

/**
 * Insert a single object into the mongodb collection.
 *
 * @param {object} data - The data object.
 * @param {string} encoding - The Buffer encoding. Not used in objectMode.
 * @param {function} cb - cb to let the stream know the write is finished.
 *
 */
  _write(data, encoding, cb) {
    insert.call(this, data, 'insert', cb);
  }

/**
 * Insert an Array of objects into the mongodb collection.
 *
 * @param {chunks} Array - List of data objects.
 * @param {function} cb - cb to let the stream know the write is finished.
 *
 */
  _writev(chunks, cb) {
    const data = chunks.map(bufferObj => bufferObj.chunk);
    insert.call(this, data, 'insertMany', cb);
  }
};


export default InsertMixin;
