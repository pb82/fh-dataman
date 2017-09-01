import assert from 'assert';
import mongoQuery from './';

export function testEq(done) {
  const mockReq = {query:{filter: JSON.stringify({"eq":{"fieldname":{"type":"String","value":"fieldvalue"}}})}};
  const expectedMongoQuery = {
    $and: [{fieldname: 'fieldvalue'}]
  };

  const middleware = mongoQuery();
  middleware(mockReq, {}, err => {
    assert.ok(!err);
    assert.deepEqual(mockReq.query.mongoQuery, expectedMongoQuery);
    done();
  });
}

export function testNe(done) {
  const mockReq = {query:{filter: JSON.stringify({"ne":{"fieldname":{"type":"String","value":"fieldvalue"}}})}};
  const expectedMongoQuery = {
    $and: [{fieldname: {$ne: 'fieldvalue'}}]
  };

  const middleware = mongoQuery();
  middleware(mockReq, {}, err => {
    assert.ok(!err);
    assert.deepEqual(mockReq.query.mongoQuery, expectedMongoQuery);
    done();
  });
}

export function testAll(done) {
  const mockReq = {query:{filter: JSON.stringify({"eq":{"fieldname": {"type": "Any", "value": "2.5"}}})}};

  const middleware = mongoQuery();
  middleware(mockReq, {}, err => {
    assert.ok(!err);
    const allQueries = mockReq.query.mongoQuery['$and'][0]['$or'];
    assert.equal(allQueries.length, 4)  ;
    assert.ok(allQueries.some(query => query.fieldname === '2.5'));
    assert.ok(allQueries.some(query => query.fieldname === 2.5));
    assert.ok(allQueries.some(query => query.fieldname === null));
    assert.ok(allQueries.some(query => query.fieldname.toString() === new Date('2.5').toString()));
    done();
  });
}
