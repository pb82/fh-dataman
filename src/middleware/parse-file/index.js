import BusboyZip from './lib/BusboyZip';
import parsers from './lib/parsers';
import BatchStream from './lib/BatchStream';
import UnsupportedMediaError from '../../Errors/UnsupportedMediaError';
import RequestEntityTooLargeError from '../../Errors/RequestEntityTooLargeError';
import customMimeTypes from './lib/customMimeTypes';
import mime from 'mime';
import os from 'os';

mime.define(customMimeTypes);

const defaultOptions = {
  memoryLimit: 30
};

/**
 * Set stream parser chain on the uploaded file stream.
 *
 * @param {object} file - FileReadStream.
 * @param {string} mimetype - Attach parser chain based on the file mime type
 *
 * @returns {object} - A WriteStream that will stream the file data in the correct parsed format.
 */
function setParsers(file, mimetype) {
  const parserChain = typeof parsers[mimetype] === 'function' && parsers[mimetype]();

  if (!parserChain) {
    return null;
  }

  file = parserChain.reduce((file, parser) => file.pipe(parser), file);
  return file;
}

/**
 * Control the buffer size on the file.
 * This adds a stream to the chain that controls the amount of memory used by the stream.
 * The stream will write in batches, only when the buffer is full (or the underlying ReadStream ends) will all data be flushed.
 * The buffer is fully flushed before allowing more writes to the stream.
 *
 * @param {object} file - FileReadStream.
 * @param {Number} memoryLimit -  The percentage of free RAM to be used when reading files.
 *
 * @returns {object} - A stream that writes in batches instead of flowing.
 */
function setBufferLimit(file, memoryLimit) {
  return file.pipe(new BatchStream({
    highWaterMark: getFreeKilobytes(memoryLimit)
  }));
}

/**
 * Get the number of free memory in kilobytes to be allocated to stream buffer size.
 * Calculated from percentage of memory indicated by memoryLimit.
 *
 * @param {Number} memoryLimit -  The percentage of free memory to be used.
 *
 * @returns {Number} - Number of free kilobytes of memory.
 */
function getFreeKilobytes(memoryLimit) {
  return  Math.floor(os.freemem() * (memoryLimit / 100));
}

/**
 * Middleware to parse incoming form file data.
 * parse-file will attach a stream parser chain to the file to present the data in the required format.
 * Parsers will be retrieved from parsers.js and will be mapped based on the mime type of the incoming file.
 *
 * @param {object} options
 * @param {object} [options.memoryLimit=30] - The percentage of free RAM to be used as a memory limit when reading files.
 */
export default function(options={}) {

  options = Object.assign(defaultOptions, options);

  return (req, res, next) => {
    let busboyZip;
    try {
      busboyZip = new BusboyZip({
        headers: req.headers,
        zipMemoryLimit: getFreeKilobytes(options.memoryLimit)
      });
    } catch (err) {
      return next(new UnsupportedMediaError());
    }

    req.files = [];

    busboyZip.on('file', function(fieldname, file, fileName, encoding) {
      if (!fileName) {
        // Must always handle filestream even if no underlying file resource actually exists.
        return file.resume();
      }

      const mimetype = mime.lookup(fileName);
      file = setBufferLimit(file, options.memoryLimit);
      file = setParsers(file, mimetype) || file;
      file.meta = {fileName, encoding, mimetype};
      req.files.push(file);
    });

    busboyZip.on('end', next);
    busboyZip.on('error', next);
    busboyZip.on('memorylimit', () => {
      req.files.forEach(file => file.resume());
      next(new RequestEntityTooLargeError());
    });

    req.pipe(busboyZip);
  };

}
