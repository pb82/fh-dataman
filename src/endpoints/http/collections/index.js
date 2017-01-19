import listCollectionsInfo from './list';
import createCollection from './create';
import deleteCollections from './delete';
import _ from 'lodash';

export function collectionsHandler(router) {
  //list collection info
  router.get('/collections', function(req, res, next) {
    var appname = req.param('appname');
    req.log.debug({app: appname}, 'listing collections for app');
    listCollectionsInfo(req.param('appname'), req.log, req.db)
      .then(result => {
        req.log.trace({app: appname, result}, 'collection data listed');
        res.json(result);
      })
      .catch(next);
  });

  //create collection
  router.post('/collections', (req, res, next) => {
    if (!req.body.name) {
      return res.status(400).send('name is required');
    }
    const name = req.body.name;
    createCollection(req.param('appname'), req.log, req.db, name)
      .then(result => {
        req.log.trace({name}, 'collection created');
        return res.status(201).send(result.concat(' collection created'));
      }).catch(next);
  });

  // Delete collection
  router.delete('/collections/', (req, res, next) => {
    if (!req.query.names) {
      return res.status(400).send('names(s) of collection(s) is required');
    }
    const reqCollections = req.query.names.split(',');
    console.log("reqCollections: ", reqCollections);
    req.db.listCollections().toArray().then(function(items) {
      const promises = items.map(function(item) {
        if (_.includes(reqCollections, item.name)) {
          console.log("item.name: ", item.name);
          return deleteCollections(req.param('appname'), req.log, req.db, item.name);
        }
      });
      if (!promises) {
        return next();
      }
      return Promise.all(promises);
    }).then(function(collections) {
      console.log("then  collections: ", collections);
      const names = collections.map(function(object) {
        return object.name;
      });
      const appname = req.param('appname');
      req.log.trace({app: appname, names}, 'collection(s) deleted');
      return res.status(200).send(names.toString().concat(' collection(s) deleted'));
    }).catch(next);
  });
}