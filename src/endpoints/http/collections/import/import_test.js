import assert from 'assert';
import proxyquire from 'proxyquire';
import fs from 'fs';
import stream from 'stream';
import statusCodes from 'http-status-codes';


class MockStream extends stream.Transform {
  _write(data, encoding, cb) {
    data = JSON.parse(data.toString());
    if (data.error) {
      this.emit('error', {message:'test-error'});
    }

    cb();
  }
}
const importer = proxyquire('./', {
  './mongoStream': {InsertStream: MockStream}
});

const mockCollections = [{name: 'collection1'}, {name: 'collection2'}, {name: 'collection3'}];
const mockDb = {
  listCollections: function() {
    return {
      toArray: cb => cb(null, mockCollections)
    };
  }
};



export function testInsertCollectionSuccess(done) {
  const file = fs.createReadStream(`${__dirname}/data.json`);

  importer.insertCollection(file, 'newCollection', mockDb)
    .then(() => {
      assert.ok(true);
      done();
    })
    .catch(() => {
      assert.ok(false);
    })
    .catch(done);
}

export function testInsertError(done) {
  const file = fs.createReadStream(`${__dirname}/error-data.json`);

  importer.insertCollection(file, 'newCollection', mockDb)
    .then(() => {
      assert.ok(false);
      done();
    })
    .catch(err => {
      assert.ok(err);
      assert.equal(err.message, 'test-error');
      done();
    })
    .catch(done);
}

export function testInsertDuplicateCollection(done) {
  const file = fs.createReadStream(`${__dirname}/data.json`);

  importer.insertCollection(file, 'collection1', mockDb)
    .then(() => {
      assert.ok(false);
      done();
    })
    .catch(err => {
      assert.ok(err);
      assert.equal(err.code, statusCodes.CONFLICT);
      done();
    })
    .catch(done);
}

export function testcollectionName(done) {
  let name = importer.getCollectionName('data.json');
  assert.equal('data', name);

  name = importer.getCollectionName('new.sub.collection.data.json');
  assert.equal('new.sub.collection.data', name);

  done();
}
