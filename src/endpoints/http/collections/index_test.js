/* eslint-disable no-console */
import assert from 'assert';
import supertest from 'supertest';
import express from 'express';
import sinon from 'sinon';
import * as createImpl from './create';
import * as listImpl from './list';
import * as deleteImpl from './delete';
import {collectionsHandler} from './index';
import {getLogger} from '../../../logger';
import bodyParser from 'body-parser';

var app = express();
var router = express.Router();
var logger = getLogger();
const getCollectionNamesStub = sinon.stub();
collectionsHandler(router);
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.log = logger;
  req.db = {
    getCollectionNames: getCollectionNamesStub
  };
  next();
});
app.use('/api', router);

module.exports = {
  'test collection handlers': {
    'before': function(done) {
      sinon.stub(listImpl, 'default', function() {
        console.log('use mock listImpl');
        return Promise.resolve([{'ns':'test.test1', 'name':'test1', 'count': 1, 'size': 100}]);
      });
      sinon.stub(deleteImpl, 'default', () => {
        console.log('use mock deleteImpl');
        return Promise.resolve(['collection1', 'collection2']);
      });
      sinon.stub(createImpl, 'default', () => {
        console.log('use mock createImpl');
        return Promise.resolve('testCollection');
      });
      getCollectionNamesStub.onCall(0).returns(['collection1', 'collection2']);
      getCollectionNamesStub.onCall(1).returns(null);
      getCollectionNamesStub.onCall(2).returns(['collection1', 'collection2']);
      done();
    },
    'after': function(done) {
      sinon.restore();
      done();
    },
    'test list handler': function(done) {
      supertest(app)
        .get('/api/collections')
        .expect(200)
        .end(done);
    },
    'test delete handler': () => {
      supertest(app)
        .delete('/api/collections?names=collection1,collection2')
        .expect(200)
        .then(function(res) {
          assert.equal(res.text, '"collection1,collection2 collection(s) deleted"');
        });
    },
    'test delete handler no collections in db': done => {
      supertest(app)
        .delete('/api/collections?names=collection1')
        .expect(400)
        .expect('No collections exists in database')
        .end(done);
    },
    'test delete handler empty query': done => {
      supertest(app)
        .delete('/api/collections?')
        .expect(400)
        .expect('names(s) of collection(s) is required')
        .end(done);
    },
    'test create handler': () => {
      supertest(app)
        .post('/api/collections')
        .send({name: 'testCollection'})
        .expect(201)
        .then(function(res) {
          assert.equal(res.text, 'testCollection collection deleted');
        });
    }
  }
};