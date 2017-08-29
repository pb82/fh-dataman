import {collectionsHandler} from './collections';
import express from 'express';
import fhconfig from 'fh-config';
import dbConnection from '../../middleware/dbConnection';
import parseFile from '../../middleware/parse-file';
import authorize from '../../middleware/route-authorize';

const PATH_PREFIX = "/api/:domain/:envId/:appGuid/data";

function attachMiddlewares(router) {
  // Router level middleware
  router.use(authorize());
  const dbConfig = fhconfig.getConfig().rawConfig;
  router.use(dbConnection(dbConfig));

  // Route level middleware
  var importEndpoint = router.route('/collections/import');
  importEndpoint.post(parseFile({memoryLimit: fhconfig.value('memoryLimit')}));
}

export default function buildAPI(server) {
  var router = express.Router({mergeParams:true});
  attachMiddlewares(router);
  collectionsHandler(router);

  server.use(PATH_PREFIX, router);
}
