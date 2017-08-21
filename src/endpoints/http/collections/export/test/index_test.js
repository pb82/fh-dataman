import assert from 'assert';
import sinon from 'sinon';
import sinonStubPromise from 'sinon-stub-promise';
import * as index from '../';
import * as parsers from '../lib/parser';
import * as archive from '../lib/archive';
import fs from 'fs';
import stream from 'stream';
import * as fhconfig from 'fh-config';

class MockWriteStream extends stream.Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(data, encoding, cb) {
    data = JSON.parse(data.toString());
    data.error ? this.emit('error') : this.push(data);
    cb();
  }
}

sinonStubPromise(sinon);
const listStub = sinon.stub().returnsPromise();
const statsStub = sinon.stub();
const collectionStub = sinon.stub();
const streamStub = sinon.stub();

const originalParser = parsers.default.json;

const mockDb = {
  listCollections: () => ({ toArray: listStub }),
  collection: collectionStub
};

const exportCollections = index.default;
const supportedFormat = 'json';
const allCollections = [];
const reqCollections = ['collection1'];

export function testExportReqCollections(done) {
  statsStub.yields(null, { size: 100 });
  collectionStub.returns({
    find: () => ({ stream: streamStub }),
    stats: statsStub
  });
  parsers.default.json = sinon.stub().returns({ "_id": 1, "item": "bottle", "qty": 30 });
  archive.default = () => fs.createReadStream(`${__dirname}/export.json`);

  fhconfig.init('config/dev.json', () => {
    exportCollections(mockDb, reqCollections, supportedFormat, new MockWriteStream).then(() => {
      parsers.default.json = originalParser;
      done();
    });
  });
}

export function testExportAllCollections(done) {
  listStub.resolves([{name: 'indexes'}, {name: 'users'}, {name: 'collection1'}, {name: 'collection2'}]);
  statsStub.yields(null, {size: 100 } );
  collectionStub.returns({
    find: () => ({ stream: streamStub }),
    stats: statsStub
  });
  parsers.default.json = sinon.stub().returns({ "_id": 1, "item": "bottle", "qty": 30 });
  archive.default = () => fs.createReadStream(`${__dirname}/export.json`);

  fhconfig.init('config/dev.json', () => {
    exportCollections(mockDb, allCollections, supportedFormat, new MockWriteStream).then(() => {
      parsers.default.json = originalParser;
      done();
    });
  });
}

export function testExportZipFail(done) {
  listStub.resolves([{name: 'indexes'}, {name: 'users'}, {name: 'collection1'}, {name: 'collection2'}]);
  statsStub.yields(null, { size: 100 });
  collectionStub.returns({
    find: () => ({ stream: streamStub }),
    stats: statsStub
  });
  parsers.default.json = sinon.stub().returns({ "_id": 1, "item": "bottle", "qty": 30 });
  archive.default = () => fs.createReadStream(`${__dirname}/error-data.json`);

  exportCollections(mockDb, allCollections, supportedFormat, new MockWriteStream).catch(() =>{
    parsers.default.json = originalParser;
    done();
  });
}

export function testCollectionDoesNotExist(done) {
  listStub.resolves([{name: 'indexes'}, {name: 'users'}, {name: 'collection1'}, {name: 'collection2'}]);
  statsStub.yields({ message: 'ns not found'});
  collectionStub.returns({ stats: statsStub });
  exportCollections(mockDb, allCollections, supportedFormat).catch(err => {
    assert.equal(err.message, 'collection1 collection does not exist');
    done();
  });
}

export function testCollectionSizeTooBig(done) {
  listStub.resolves([{name: 'indexes'}, {name: 'users'}, {name: 'collection1'}, {name: 'collection2'}]);
  statsStub.yields(null, { size: fhconfig.value('sizeLimit') });
  collectionStub.returns({ stats: statsStub });
  fhconfig.init('config/dev.json', () => {
    exportCollections(mockDb, allCollections, supportedFormat).catch(err => {
      assert.equal(err.message, 'Cannot export collections larger than a gigabyte');
      done();
    });
  });
}
