/**
 * Global Setup & Teardown functions for the integration tests
 */
import path from 'path';
import async from 'async';
import url from 'url';
import * as server from '../../lib/app';
import * as mongodbClient from './mongodb_client';
import * as mockMbaas from './mock_mbaas_server';

var testConf = require('./test_conf.json');

export function before(done) {
  process.env.conf_file = path.resolve(__dirname, './test_conf.json');
  var port = url.parse(testConf.mbaas.url).port;
  async.series([
    cb => {
      //ignore error when drop the db, it might not exists
      mongodbClient.dropDb(() => cb());
    },
    //create the test mongodb
    cb => mongodbClient.setupDb(cb),
    //start the mock mbaas service
    cb => mockMbaas.start(port, cb),
    //start the server
    cb => server.startServer(cb)
  ], done);
}

//Note: in mocha the `after` function will not be invoked when there is assertion failures.
//It's always a good idea to cleanup data in the `before` function.
export function after(done) {
  async.series([
    cb => server.stopServer(cb),
    cb => mockMbaas.stop(cb),
    cb => mongodbClient.dropDb(cb)
  ], done);
}
