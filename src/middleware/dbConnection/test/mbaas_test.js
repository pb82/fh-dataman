import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import sinonStubPromise from 'sinon-stub-promise';
import mockMbaasClient from './mocks/fhMbaasClientMock';

sinonStubPromise(sinon);
const appEnvVarsStub = sinon.stub();
const primaryNodeStub = sinon.stub().returnsPromise();
const dbConnectionStub = sinon.stub().returnsPromise();
const feedhenryMbaasType = proxyquire('../lib/mbaas/types/feedhenry', {
  'fh-mbaas-client': {
    MbaasClient: mockMbaasClient(appEnvVarsStub, primaryNodeStub)
  }
});
const openshiftMbaasType = proxyquire('../lib/mbaas/types/openshift', {
  'fh-mbaas-client': {
    MbaasClient: mockMbaasClient(appEnvVarsStub, null, dbConnectionStub)
  }
});
const MockMbaaS = proxyquire('../lib/mbaas', {
  './types': {
    feedhenry: feedhenryMbaasType,
    openshift: openshiftMbaasType
  }
}).MBaaS;

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

function getOptions(mbaasType) {
  return {
    mbaasType: mbaasType,
    auth: {
      secret: '123456'
    },
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

  new MockMbaaS(getOptions('feedhenry'))
    .getMongoConf(getMockReq())
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
  new MockMbaaS(getOptions('feedhenry'))
    .getMongoConf(getMockReq())
    .then(conf => {
      assert.ok(!conf.__dbperapp);
      assert.equal(conf.connectionUrl, expectedUrl);
      done();
    })
    .catch(done);
}

export function appEnvVarFail(done) {
  appEnvVarsStub.yields({});
  new MockMbaaS(getOptions('feedhenry'))
  .getMongoConf(getMockReq())
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
  new MockMbaaS(getOptions('feedhenry'))
  .getMongoConf(getMockReq())
    .then(conf => {
      assert.ok(!conf);
      done();
    })
    .catch(err => {
      assert.ok(err);
      done();
    });
}

export function mongoOpenshift(done) {
  var expectedUrl = 'mongodb://user:pass@openshiftmongohost:27017/dbname';
  appEnvVarsStub.yields(null, {
    env: {
      FH_MBAAS_ENV_ACCESS_KEY: '12345',
      FH_APP_API_KEY: '12345'
    }
  });
  dbConnectionStub.yields(null, {url: expectedUrl});
  new MockMbaaS(getOptions('openshift'))
  .getMongoConf(getMockReq())
    .then(conf => {
      assert.ok(conf.__dbperapp);
      assert.equal(conf.connectionUrl, expectedUrl);
      done();
    })
    .catch(done);
}
