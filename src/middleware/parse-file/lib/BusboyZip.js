import Busboy from 'busboy';
import Zip from './Zip';
import EventEmitter from 'events';

const busboyEventTypes = ['field', 'partsLimit', 'filesLimit', 'fieldsLimit', 'error'];
const zipMimeType = 'application/zip';

function emitFiles(zipFiles) {
  const emitter = this;
  zipFiles.forEach(fileInfos => {
    fileInfos.forEach(fileInfo => {
      emitter.emit('file', fileInfo.fieldname, fileInfo.file, fileInfo.fileName, fileInfo.encoding, fileInfo.mimetype);
    });
  });

  return Promise.resolve();
}

/**
 * BusboyZip extends the busboy file parser library to handle Zip files.
 * This module will catch zip files and will emit each zip entry as an individual file event.
 */
export default class extends EventEmitter {

  constructor(options={}) {
    super();

    var self = this;
    this.busboy = new Busboy(options);
    this.filesFromZips = [];

    busboyEventTypes.forEach(function(eventType) {
      self.busboy.on(eventType, function() {
        const args = [].slice.call(arguments);
        args.unshift(eventType);
        self.emit.apply(self, args);
      });
    });

    self.busboy.on('file', (fieldname, file, fileName, encoding, mimetype) => {
      if (mimetype === zipMimeType) {
        return self.emit('zip', fieldname, file, fileName, encoding);
      }

      self.emit('file', fieldname, file, fileName, encoding, mimetype);
    });

    self.on('zip', (fieldname, file, fileName) => {
      if (!fileName) {
        // Must always handle filestream even if no underlying file resource actually exists.
        return file.resume();
      }

      const zip = new Zip(file, options.zipMemoryLimit);
      zip.on('memorylimit', self.emit.bind(self, 'memorylimit'));
      self.filesFromZips.push(zip.getEntries());
    });
  }

  write(chunk, encoding, cb) {
    this.busboy.write(chunk, cb);
  }

  end() {
    var self = this;
    self.busboy.end();

    if (!self.filesFromZips.length) {
      return self.emit('end');
    }

    Promise.all(self.filesFromZips)
      .then(emitFiles.bind(self))
      .then(() => process.nextTick(() => self.emit('end')))
      .catch(err => self.emit('error', err));
  }
}
