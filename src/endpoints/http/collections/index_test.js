/* eslint-disable no-console */
import assert from 'assert';
import supertest from 'supertest';
import express from 'express';
import sinon from 'sinon';
import * as createImpl from './create';
import * as listImpl from './list';
import * as deleteImpl from './delete';
import * as exportImpl from './export/';
import {collectionsHandler} from './index';
import {getLogger} from '../../../logger';
import bodyParser from 'body-parser';
import errorHandler from '../error';
import sinonStubPromise from 'sinon-stub-promise';
import statusCodes from 'http-status-codes';

sinonStubPromise(sinon);
const app = express();
const router = express.Router({mergeParams:true});
const logger = getLogger();
const appGuid = '123456';

collectionsHandler(router);
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.log = logger;
  next();
});
app.use('/api/:appGuid/', router);
app.use(errorHandler);

module.exports = {
  'test collection handlers': {
    'before': done => {
      sinon.stub(listImpl, 'default', () => {
        console.log('use mock listImpl');
        return Promise.resolve([{'ns':'test.test1', 'name':'test1', 'count': 1, 'size': 100}, {'ns':'test.test2', 'name':'test2', 'count': 1, 'size': 100}]);
      });
      sinon.stub(deleteImpl, 'default', () => {
        console.log('use mock deleteImpl');
        return Promise.resolve([{'name': 'collection1'}, {'name': 'collection2'}]);
      });
      sinon.stub(createImpl, 'default', () => {
        console.log('use mock createImpl');
        return Promise.resolve(true);
      });
      sinon.stub(exportImpl, 'default', () => {
        console.log('use mock exportImpl');
        return Promise.resolve(true);
      });
      done();
    },
    'after': done => {
      sinon.restore();
      done();
    },
    'test list handler': done => {
      supertest(app)
        .get(`/api/${appGuid}/collections`)
        .expect(statusCodes.OK)
        .end(done);
    },
    'test delete handler': done => {
      supertest(app)
        .delete(`/api/${appGuid}/collections?names=collection1,collection2`)
        .expect(statusCodes.OK)
        .expect(res => assert.equal(res.text, 'collection1,collection2 collection(s) deleted'))
        .end(done);
    },
    'test delete handler names of collections required': done => {
      supertest(app)
        .delete(`/api/${appGuid}/collections?`)
        .expect(statusCodes.BAD_REQUEST)
        .end(done);
    },
    'test create handler': done => {
      supertest(app)
        .post(`/api/${appGuid}/collections`)
        .send({name: 'testCollection'})
        .expect(statusCodes.CREATED)
        .expect(res => assert.equal(res.text, 'testCollection collection created'))
        .end(done);
    },
    'test create handler name required': done => {
      supertest(app)
        .post(`/api/${appGuid}/collections`)
        .expect(statusCodes.BAD_REQUEST)
        .end(done);
    },

    'test export handler': done => {
      supertest(app)
        .get(`/api/${appGuid}/collections/export?format=json`)
        .expect(statusCodes.OK)
        .end(done);
    },

    'test export handler format required': done => {
      supertest(app)
        .get(`/api/${appGuid}/collections/export?format=`)
        .expect(statusCodes.BAD_REQUEST)
        .end(done);
    },

    'test export handler unsupported media': done => {
      supertest(app)
        .get(`/api/${appGuid}/collections/export?format=txt`)
        .expect(statusCodes.UNSUPPORTED_MEDIA_TYPE)
        .end(done);
    }
  }
};
