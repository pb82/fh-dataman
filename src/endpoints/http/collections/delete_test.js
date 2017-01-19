import assert from 'assert';
import deleteCollections from './delete';
import sinon from 'sinon';

const mockLogger = {
  debug: () => {}
};

const dropStub = sinon.stub();

const mockDb = {
  getCollection: name => {
    return {
      drop: dropStub
    };
  }
};

const reqCollections = [
  'collection1',
  'collection2'
];

export function testDeleteCollections(done) {
  dropStub.returns(true);
  deleteCollections('test-delete-app', mockLogger, mockDb, reqCollections).then(result => {
    assert.equal(result[0], reqCollections[0]);
    assert.equal(result[1], reqCollections[1]);
    done();
  }).catch(done);
}

export function testDeleteCollectionsFailure(done) {
  dropStub.returns(false);
  deleteCollections('test-delete-app', mockLogger, mockDb, reqCollections).catch(() => {
    return done();
  });
}