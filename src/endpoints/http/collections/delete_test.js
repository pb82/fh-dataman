import bodyParser from 'body-parser';
import {deleteCollections} from './delete.js';
import express from 'express';
import sinon from 'sinon';
import supertest from 'supertest';

const collectionEndPoint = '/collections';
const app = express();
const getCollectionNamesStub = sinon.stub();
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.db = {
    getCollectionNames: getCollectionNamesStub,
    getCollection: function(name) {
      return {name: name};
    }
  };

  req.db.collectionToDelete = {
    drop: function() {
      return true;
    }
  };

  req.log = {
    debug: function() {},
  };

  next();
});

export function collectionNamesParamRequired(done) {
  deleteCollections(app);

  supertest(app)
    .post(collectionEndPoint)
    .expect(400)
    .expect(res => {
      res.message = 'names(s) of collection(s) is required';
    })
    .end(done);
}

export function noCollectionsInDatabase(done) {
  getCollectionNamesStub.returns(null);
  deleteCollections(app);

  supertest(app)
    .post(collectionEndPoint)
    .send({
      names: [
        'collection1',
        'collection2',
        'collection3'
      ]
    })
    .expect(400)
    .expect(res => {
      res.message = 'No collections exists in database';
    })
    .end(done);
}

export function dropCollections(done) {
  getCollectionNamesStub.returns(['collection1', 'collection2', 'employees']);
  deleteCollections(app);

  supertest(app)
   .post(collectionEndPoint)
   .send({
     names: [
       'collection1',
       'collection2',
       'collection3'
     ]
   })
   .expect(200)
   .expect(res => {
     res.message = 'ok';
   })
   .end(done);
}