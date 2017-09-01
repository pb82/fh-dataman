import { Transform } from 'stream';

/**
 * This class adds the capability to control the flow of data passed through a stream chain.
 * Batchstream will uncork when the buffer is full and cork again when the buffer is drained.
 * Batch size is controlled by the highWatermark option.
 */
class BatchStream extends Transform {
  constructor(options={}) {
    super(options);

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

  _transform(data, encoding, callback) {
    this.push(data);
    callback();
  }

}

export default BatchStream;
