import stream from 'stream';

const DEFAULT_BATCH_SIZE = 1000;
var defaultOptions = {
  objectMode: true,
  highWaterMark: DEFAULT_BATCH_SIZE
};

/**
 * Base class for streams interacting with mongo db.
 * This class adds the capability to control the number of objects written to the underlying resource.
 * A standard objectMode stream will call _write for each object in the stream.
 * Batchstream will call _write or _writev when the buffer is full.
 * Batch size is controlled by the highWatermark option.
 */
class BatchStream extends stream.Writable {
  constructor(options={}) {
    super(Object.assign(defaultOptions, options));

    this.cork();

    this.on('drain', this.cork.bind(this));
  }

  write(chunk, encoding, callback) {
    const hasBufferSpace = super.write(chunk, encoding, callback);
    if (!hasBufferSpace) {
      process.nextTick(this.uncork.bind(this));
    }

    return hasBufferSpace;
  }

}

export default BatchStream;
