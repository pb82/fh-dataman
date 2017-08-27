import stream from 'stream';
import csvWriter from 'csv-write-stream';

class json extends stream.Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(data, encoding, cb) {
    data = `${JSON.stringify(data)}\r\n`;
    this.push(data);
    cb();
  }
}

export default {
  bson: collection => Promise.resolve(collection),
  json: collection => {
    const parserJson = new json();
    parserJson.filename = collection.filename;
    return Promise.resolve(collection.pipe(parserJson));
  },
  csv: collection => {
    const writer = csvWriter();
    writer.filename = collection.filename;
    return Promise.resolve(collection.pipe(writer));
  }
};
