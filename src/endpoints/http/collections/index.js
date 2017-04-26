import listCollections from './list';
import createCollection from './create';
import deleteCollections from './delete';
import {insertCollections, getCollectionNames} from './files';
import exportCollections from './export';
import statusCodes from 'http-status-codes';
import UnsupportedMediaError from '../../../Errors/UnsupportedMediaError';

const DUPLICATE_DOCUMENT_ID = 11000;
const INCOMPATIBLE_DATA = 22000;

export function collectionsHandler(router) {
  //list collection info
  router.get('/collections', (req, res, next) => {
    var appGuid = req.params.appGuid;
    req.log.debug({app: appGuid}, 'listing collections for app');
    listCollections(appGuid, req.log, req.db)
      .then(result => {
        req.log.trace({app: appGuid, result}, 'collection data listed');
        res.json(result);
      })
      .catch(next);
  });

  //create collection
  router.post('/collections', (req, res, next) => {
    if (!req.body.name) {
      return next({'message': 'name is required', code: statusCodes.BAD_REQUEST});
    }
    const name = req.body.name;
    createCollection(req.params.appGuid, req.log, req.db, name)
      .then(() => {
        req.log.trace({name}, 'collection created');
        return res.status(statusCodes.CREATED).send(name.concat(' collection created'));
      }).catch(next);
  });

  // Delete collection
  router.delete('/collections', (req, res, next) => {
    if (!req.query.names) {
      return next({'message': 'names(s) of collection(s) is required', code: statusCodes.BAD_REQUEST});
    }

    const reqCollections = req.query.names.split(',');
    deleteCollections(req.params.appGuid, req.log, req.db, reqCollections)
      .then(function(collections) {
        if (!collections.length) {
          return next({'message': 'collection(s) requested do not exist', code: statusCodes.BAD_REQUEST});
        }

        const names = collections.map(function(object) {
          return object.name;
        });
        req.log.trace({app: req.params.appGuid, names}, 'collection(s) deleted');
        return res.status(statusCodes.OK).send(names.toString().concat(' collection(s) deleted'));
      })
      .catch(next);
  });

  // Upload collections from files
  router.post('/collections/upload', (req, res, next) => {
    if (!req.files.length) {
      return next({message: 'No file', code: statusCodes.BAD_REQUEST});
    }

    req.log.debug({collectionNames: getCollectionNames(req.files)}, 'Starting collections upload');

    insertCollections(req.files, req.db)
      .then(importedCollections => {
        req.log.trace({importedCollections}, 'Collections upload completed');
        res.status(statusCodes.CREATED).end();
      })
      .catch(err => {
        if (err.code === INCOMPATIBLE_DATA) {
          err.message = `File ${err.collectionName} unsupported`;
          err.code = statusCodes.UNSUPPORTED_MEDIA_TYPE;
        }

        if (err.code !== statusCodes.CONFLICT) {
          deleteCollections(req.params.appGuid, req.log, req.db, [err.collectionName]);
        }

        if (err.code === DUPLICATE_DOCUMENT_ID) {
          err.code = statusCodes.CONFLICT;
        }

        next(err);
      });
  });

  router.get('/collections/export', (req, res, next) => {
    const supportedFormats = ["csv", "json", "bson"];
    if (!req.query.format.length) {
      return next({ message: 'No format selected', code: statusCodes.BAD_REQUEST });
    } else if (supportedFormats.indexOf(req.query.format) < 0) {
      return next(new UnsupportedMediaError(`${req.query.format} is not supported`));
    }
    res.setHeader('Content-disposition', 'attachment; filename=collections.zip');
    res.setHeader('Content-type', 'application/zip');

    const collections = req.query.collections ? req.query.collections.split(',') : [];
    req.log.debug(collections.length ? collections : ['ALL COLLECTIONS'], 'collection(s) export started');

    exportCollections(req.db, collections, req.query.format, res)
      .then(() => {
        req.log.trace(collections.length ? collections : ['ALL COLLECTIONS'], ' Collection(s) export complete');
        res.status(statusCodes.OK).end();
      })
      .catch(err => {
        next(err);
      });
  });
}
