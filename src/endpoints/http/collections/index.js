import listCollections from './list';
import createCollection from './create';
import deleteCollections from './delete';
import _ from 'lodash';

export function collectionsHandler(router) {
  //list collection info
  router.get('/collections', function(req, res, next) {
    var appname = req.param('appname');
    req.log.debug({app: appname}, 'listing collections for app');
    listCollections(req.param('appname'), req.log, req.db)
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
        req.log.trace({name}, ' collection created');
        return res.status(201).send(result, 'collection created');
      }).catch(next);
  });

  // Delete collection
  router.delete('/collections/', (req, res, next) => {
    if (!req.query.names) {
      return res.status(400).send('names(s) of collection(s) is required');
    }
    const reqCollections = req.query.names.split(',');
    const allCollections = req.db.getCollectionNames();
    if (!allCollections) {
      return res.status(400).send('No collections exists in database');
    }
    const collectionsToDelete = _.filter(reqCollections, name => {
      if (_.includes(allCollections, name)) {
        return name;
      } else {
        return res.status(400).send({name}, ' collection does not exist in database');
      }
    });
    const appname = req.param('appname');
    deleteCollections(req.param('appname'), req.log, req.db, collectionsToDelete)
      .then(result => {
        req.log.trace({app: appname, result}, ' collection(s) deleted');
        return res.status(200).send(result, 'collection(s) deleted');
      }).catch(next);
  });
}