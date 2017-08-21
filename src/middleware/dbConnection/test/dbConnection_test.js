import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import sinonStubPromise from 'sinon-stub-promise';
import EventEmitter from 'events';

sinonStubPromise(sinon);
const mongoConfStub = sinon.stub().returnsPromise();
const mongoCompatApiStub = sinon.stub().returnsPromise();
class MyEmitter extends EventEmitter {}
const middleware = proxyquire('../', {
  './lib/mbaas': {
    getMongoConf: mongoConfStub
  },
  'fh-db': {
    createMongoCompatApi: mongoCompatApiStub
  }
});

function getMockReq() {
  return {
    log: {
      debug: function() {},
      info: function() {}
    }
  };
}

export function getDbConnectionSuccess(done) {
  const mockRes = new MyEmitter();
  const mockReq = getMockReq();

  mongoConfStub.resolves({});
  mongoCompatApiStub.resolves({close: function() {}});
  const underTest = middleware.default({});

  underTest(mockReq, mockRes, () => {
    assert.ok(mockReq.db);
    mockRes.emit('end');
    done();
  });
}

export function getDbConnectionFailOnConf(done) {
  const mockRes = new MyEmitter();
  const mockReq = getMockReq();

  mongoConfStub.rejects({});
  mongoCompatApiStub.resolves({close: function() {}});
  const underTest = middleware.default({});

  underTest(mockReq, mockRes, err => {
    assert.ok(err);
    assert.ok(!mockReq.db);
    mockRes.emit('end');
    done();
  });
}

export function getDbConnectionFailOnCompatApi(done) {
  const mockRes = new MyEmitter();
  const mockReq = getMockReq();

  mongoConfStub.resolves({});
  mongoCompatApiStub.rejects({});
  const underTest = middleware.default({});

  underTest(mockReq, mockRes, err => {
    assert.ok(err);
    assert.ok(!mockReq.db);
    mockRes.emit('end');
    done();
  });
}

