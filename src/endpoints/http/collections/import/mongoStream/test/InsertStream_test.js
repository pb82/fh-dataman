import assert from 'assert';
import sinon from 'sinon';
import fs from 'fs';
import stream from 'stream';
import { InsertStream } from  '../';

/**
 * Transform class to turn our string JSON data into objects.
 */
class TransformToObject extends stream.Transform {
  constructor() {
    super({objectMode:true});
  }

  _transform(data, encoding, cb) {
    data.split('\n')
      .filter(line => line.length)
      .forEach(line => this.push(JSON.parse(line)));

    cb();
  }
}

function getSpies() {
  const insertSpy = sinon.spy();
  const insertManySpy = sinon.spy();
  const collection = {
    insert(data, cb) {
      insertSpy(data);
      cb();
    },
    insertMany(data, cb) {
      insertManySpy(data);
      cb();
    }
  };

  return [insertSpy, insertManySpy, collection];
}

function getOption(opts) {
  return {
    highWaterMark: opts.highWaterMark,
    collectionName: 'test-collection',
    db: {
      collection: function(name, cb) {
        cb(opts.err, opts.collection);
      }
    }
  };
}

function createTestStream(highWaterMark, err, cb) {
  const [insertSpy, insertManySpy, collection] = getSpies();
  const option = getOption({highWaterMark, collection, err});
  const stream = fs.createReadStream(`${__dirname}/data.json`, {encoding: 'utf8'})
  .pipe(new TransformToObject())
  .pipe(new InsertStream(option));

  cb(stream, {insertSpy, insertManySpy});
}

export function testSingleWrite(done) {
  createTestStream(1, null, (stream, spies) => {
    stream.on('finish', () => {
      assert.ok(spies.insertSpy.calledThrice);
      assert.ok(spies.insertManySpy.notCalled);
      done();
    });
  });
}

export function testBatchWrite(done) {
  createTestStream(2, null, (stream, spies) => {
    stream.on('finish', () => {
      assert.ok(spies.insertSpy.calledOnce);
      assert.ok(spies.insertManySpy.calledOnce);
      assert.equal(spies.insertManySpy.getCall(0).args[0].length, 2);
      done();
    });
  });
}

export function testError(done) {
  createTestStream(1, {}, stream => {
    stream.on('error', () => {
      assert.ok(true);
      done();
    });
  });
}
