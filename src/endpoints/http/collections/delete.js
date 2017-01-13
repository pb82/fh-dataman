import _ from 'lodash';

function message(message) {
  return { message };
}
/**
 * Add the route to delete collection(s) for the users App.
 * This route expects a db connection to be present on the request object.
 * 
 * @param  {Object} router - The express router.
 */
export function deleteCollections(router) {
  router.post('/collections', (req, res, next) => {
    const reqCollections = req.body.names;
    if (!reqCollections) {
      return res.status(400).send(message('names(s) of collection(s) is required'));
    }
    const allCollectionNames = req.db.getCollectionNames();
    if (!allCollectionNames) {
      return res.status(400).send(message('No collections exists in database'));
    }
    _.filter(reqCollections, function(name) {
      if (_.includes(allCollectionNames, name)) {
        const collectionToDelete = req.db.getCollection(name);
        req.log.debug({name}, 'deleting collection');
        req.db.collectionToDelete.drop();
        req.log.debug({name}, 'collection delete');
      } else {
        req.log.debug({name}, 'collection does not exist in database');
      }
    });
    res.status(200).send(message('ok'));
  });
}