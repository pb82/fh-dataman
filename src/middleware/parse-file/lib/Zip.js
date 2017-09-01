import concat from 'concat-stream';
import yauzl from 'yauzl';
import mime from 'mime';
import EventEmitter from 'events';
import meter from 'stream-meter';
import customMimeTypes from './customMimeTypes';

mime.define(customMimeTypes);

function entryFileStream(entry, file) {
  return {
    file: file,
    fieldname: '',
    fileName: entry.fileName,
    encoding: '7bit',
    mimetype: mime.lookup(entry.fileName)
  };
}

function isNotValid(entry) {
  return /\/$/.test(entry.fileName) || entry.fileName.includes('__MACOSX');
}

function addEntryFileStream(entry) {
  const self = this;

  self.zip.openReadStream(entry, function(err, fileStream) {
    if (err) {
      return self.zip.emit('error', err);
    }

    if (isNotValid(entry)) {
      return;
    }

    self.entryFileStreams.push(entryFileStream(entry, fileStream));
  });
}

/**
 * Zip takes a Zip filestream and resolves the entries in the Zip as individual Readstreams.
 */
class Zip extends EventEmitter {

  constructor(file={}, memoryLimit) {
    super();

    const self = this;

    self.file = file;
    self.entryFileStreams = [];

    self.entries = new Promise((resolve, reject) => {

      var m = meter(memoryLimit);
      m.on('error', err => {
        self.file.resume();
        self.emit('memorylimit', err);
      });

      /**
       * Zip files are designed with the Central Directory (the authority on the contents of the .zip file)
       * at the end of the file, not the beginning.
       * For this reason a Zip file cannot be streamed and the whole Zip file needs to be buffered before manipulating the entries.
       *
       * See https://github.com/thejoshwolfe/yauzl#no-streaming-unzip-api
       */
      self.file.pipe(m).pipe(concat(buffer => {
        yauzl.fromBuffer(buffer, (err, zip) => {
          if (err) {
            return reject(err);
          }

          self.zip = zip;
          self.zip.on('entry', addEntryFileStream.bind(self));
          self.zip.on('end', () => {
            resolve(self.entryFileStreams);
          });
          self.zip.on('error', reject);
        });
      }));
    });
  }

  getEntries() {
    return this.entries;
  }
}

export default Zip;
