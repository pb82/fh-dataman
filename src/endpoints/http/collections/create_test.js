import assert from 'assert';
import createCollection from './create';
import sinon from 'sinon';

const mockLogger = {
  debug: () => {}
};

const createCollectionStub = sinon.stub();

const mockDb = {
  createCollection: createCollectionStub
};

export function testCreateCollection(done) {
  createCollectionStub.yields(null);
  createCollection('test-create-collection', mockLogger, mockDb, 'testCollection').then(result => {
    assert.equal(result, 'testCollection');
  });
  done();
}

export function testCreateCollectionFailure(done) {
  createCollectionStub.yields('someError');
  createCollection('test-create-collection', mockLogger, mockDb, 'testCollection').catch(function() {
    return done();
  });
}