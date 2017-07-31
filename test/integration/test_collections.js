import async from 'async';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import chai from 'chai';
import chaiHttp from 'chai-http';
import statusCodes from 'http-status-codes';
import fhconfig from 'fh-config';
chai.use(chaiHttp);
const expect = chai.expect;
import * as mongodbClient from './mongodb_client';
const testConf = require('./test_conf.json');

const SERVER_URL = `http://localhost:${testConf.port}`;
const PATH_PREFIX = '/api/testing/dev/testappguid/data';

var TOKEN = null;

const COLLECTIONS = [
  {name: 'test1', docs: [{field1: 'field1', field2:'field2'}]},
  {name: 'test2', docs: [{field1: 'field1', field2:'field2'}]}
];

module.exports = {
  'test_collections': {
    'before': function(done) {
      fhconfig.init('config/dev.json', () => {
        const payload = {
          user: {
            email: "test@email.com",
            username: "user101",
            domain: "testing",
            sub: "1234subdomain"
          },
          entity: {
            guid: 'testappguid'
          },
          permissions: [{
            businessObject: fhconfig.value('businessObjects')[0],
            permissions: {
              write: true,
              read: true
            }
          }]
        };

        TOKEN = jwt.sign(payload, testConf.auth.secret);

        mongodbClient.createCollectionsWithDocs(COLLECTIONS, done);
      });
    },

    'test_collection_list': function(done) {
      chai.request(SERVER_URL)
          .get(`${PATH_PREFIX}/collections`)
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.OK);
            expect(res).to.be.json;
            expect(res.body).to.have.lengthOf(4); //there will be system.users and system.indexes as well
            const col1 = res.body.filter(col => col.name === COLLECTIONS[0].name);
            const col2 = res.body.filter(col => col.name === COLLECTIONS[1].name);
            expect(col1[0].count).to.equal(COLLECTIONS[0].docs.length);
            expect(col2[0].count).to.equal(COLLECTIONS[1].docs.length);
            done();
          });
    },

    'test_collection_create': function(done) {
      chai.request(SERVER_URL)
          .post(`${PATH_PREFIX}/collections`)
          .send({name: 'testCreate'})
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.CREATED);
            expect(res.text).to.equal('testCreate collection created');
            done();
          });
    },

    'test_collection_delete': done => {
      chai.request(SERVER_URL)
         .delete(`${PATH_PREFIX}/collections`)
         .query({names: 'test1,test2'})
         .set('Authorization', `Bearer ${TOKEN}`)
         .end((err, res) => {
           expect(err).to.be.null;
           expect(res).to.have.status(statusCodes.OK);
           expect(res.text).to.equal('test1,test2 collection(s) deleted');
           mongodbClient.createCollectionsWithDocs(COLLECTIONS, done);
         });
    },

    'test_collection_import': function(done) {
      const test = (ext, cb) => {
        chai.request(SERVER_URL)
          .post(`${PATH_PREFIX}/collections/import`)
          .attach('file', fs.readFileSync(`${__dirname}/fixture/import.${ext}`), `import.${ext}` )
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.CREATED);
            mongodbClient.dropCollection('import', cb);
          });
      };
      async.eachSeries(['json', 'csv', 'bson'], test, done);
    },

    'test_zip_import': function(done) {
      const test = (zipName,cb) => {
        chai.request(SERVER_URL)
          .post(`${PATH_PREFIX}/collections/import`)
          .attach('file', fs.readFileSync(`${__dirname}/fixture/${zipName}.zip`), `${zipName}.zip` )
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.CREATED);

            mongodbClient.getCollectionNames(collections => {
              expect(collections).to.include('collection01');
              expect(collections).to.include('collection02');
              expect(collections).to.include('collection03');

              async.parallel([
                callback => mongodbClient.dropCollection('collection01',callback),
                callback => mongodbClient.dropCollection('collection02',callback),
                callback => mongodbClient.dropCollection('collection03',callback)
              ],
              err => {
                expect(err).to.be.null;
                cb();
              });
            });
          });
      };

      async.eachSeries(['collections','import-MacOS'], test, done);
    },

    'test_zip_import_unsupported_media': function(done) {
      chai.request(SERVER_URL)
        .post(`${PATH_PREFIX}/collections/import`)
        .attach('file', fs.readFileSync(`${__dirname}/fixture/unsupportedFiles.zip`), `unsupportedFiles.zip` )
        .set('Authorization', `Bearer ${TOKEN}`)
        .end((err, res) => {
          expect(err).to.be.not.null;
          expect(res).to.have.status(statusCodes.UNSUPPORTED_MEDIA_TYPE);
          done();
        });
    },

    'test_collection_export': done => {
      const test = (ext, cb) => {
        chai.request(SERVER_URL)
          .get(`${PATH_PREFIX}/collections/export`)
          .query({ collections: 'test1', format: `${ext}` })
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.OK);
            cb();
          });
      };
      async.eachSeries(['json', 'csv', 'bson'], test, done);
    },

    'test_collection_export_unsupported_media': done => {
      chai.request(SERVER_URL)
          .get(`${PATH_PREFIX}/collections/export`)
          .query({ collections: 'test1', format: 'txt' })
          .set('Authorization', `Bearer ${TOKEN}`)
          .end(err => {
            expect(err).to.have.status(statusCodes.UNSUPPORTED_MEDIA_TYPE);
            done();
          });
    },

    'test_all_collections_export': done => {
      const test = (ext, cb) => {
        chai.request(SERVER_URL)
          .get(`${PATH_PREFIX}/collections/export`)
          .query({ format: `${ext}` })
          .set('Authorization', `Bearer ${TOKEN}`)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(statusCodes.OK);
            cb();
          });
      };
      async.eachSeries(['json', 'csv', 'bson'], test, done);
    }
  }
};
