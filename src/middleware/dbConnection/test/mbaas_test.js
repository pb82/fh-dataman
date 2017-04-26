import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import sinonStubPromise from 'sinon-stub-promise';
import mockMbaasClient from './mocks/fhMbaasClientMock';

sinonStubPromise(sinon);
const appEnvVarsStub = sinon.stub();
const primaryNodeStub = sinon.stub().returnsPromise();
const mbaas = proxyquire('../lib/mbaas', {
  'fh-mbaas-client': {
    MbaasClient: mockMbaasClient(appEnvVarsStub, primaryNodeStub)
  }
});

function getMockReq() {
  return {
    params: {
      domain: 'test-domain',
      envId: 101,
      appGuid: '12345'
    },
    log: {
      debug: function() {}
    }
  };
}

function getOptions() {
  return {
    mbaas: {
      url: 'https://api.host.com',
      password: 'pass',
      username: 'user'
    },

    ditch: {
      user: 'user',
      password: 'pass',
      host: '',
      port: '',
      database: 'dbname'
    }
  };
}

export function getDedicatedDbConnectionConf(done) {
  var expectedUrl = 'dedicatedUrl';
  appEnvVarsStub.yields(null, {
    env: {
      FH_MONGODB_CONN_URL: expectedUrl
    }
  });
  mbaas.getMongoConf(getOptions(), getMockReq())
    .then(conf => {
      assert.ok(conf.__dbperapp);
      assert.equal(conf.connectionUrl, expectedUrl);
      done();
    })
    .catch(done);
}

export function getSharedDbConnectionConf(done) {
  var expectedUrl = 'mongodb://user:pass@primaryNodeHost:primaryNodePort/dbname';
  appEnvVarsStub.yields(null, {});
  primaryNodeStub.yields(null, {
    host: 'primaryNodeHost',
    port: 'primaryNodePort'
  });
  mbaas.getMongoConf(getOptions(), getMockReq())
    .then(conf => {
      assert.ok(!conf.__dbperapp);
      assert.equal(conf.connectionUrl, expectedUrl);
      done();
    })
    .catch(done);
}

export function appEnvVarFail(done) {
  appEnvVarsStub.yields({});
  mbaas.getMongoConf(getOptions(), getMockReq())
    .then(conf => {
      assert.ok(!conf);
      done();
    })
    .catch(err => {
      assert.ok(err);
      done();
    });
}

export function mongoprimaryNodeFail(done) {
  appEnvVarsStub.yields(null, {});
  primaryNodeStub.yields({});
  mbaas.getMongoConf(getOptions(), getMockReq())
    .then(conf => {
      assert.ok(!conf);
      done();
    })
    .catch(err => {
      assert.ok(err);
      done();
    });
}
