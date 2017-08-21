import supertest from 'supertest';
import assert from 'assert';
import express from 'express';
import jwtAuthenticate from '../';
import jwt from 'jsonwebtoken';

const app = express();
const testEndPoint = '/test/endpoint';
const secret = 'test-secret';
const payloadPath = 'authenticateData';
const payload = {
  email: 'test@email.com',
  username: 'user101'
};


app.use(jwtAuthenticate({ secret: secret, payloadPath: payloadPath }));
app.use((err, req, res, next) => {
  if (err) {
    return res.status(err.code).send({ message: err.message });
  }

  return res.status(200).end();
});
app.get(testEndPoint, (req, res) => {
  res.status(200).send(req[payloadPath]);
});

export function secretRequired(done) {
  assert.throws(jwtAuthenticate, Error, 'options.secret parameter is required');
  done();
}

export function authenticationHeaderMustBeSet(done) {
  supertest(app)
    .get(testEndPoint)
    .expect(401)
    .expect(res => {
      assert.equal(res.body.message, 'Authorisation has not been set');
    })
    .end(done);
}

export function authenticationHeaderMustUseCorrectSchema(done) {
  supertest(app)
    .get(testEndPoint)
    .set('Authorization', 'Not-Bearer token')
    .expect(401)
    .expect(res => {
      assert.equal(res.body.message, 'Authorisation should use "Bearer <token>" schema');
    })
    .end(done);
}

export function authenticationHeaderMustHaveToken(done) {
  supertest(app)
    .get(testEndPoint)
    .set('Authorization', 'Bearer')
    .expect(401)
    .expect(res => {
      assert.equal(res.body.message, 'Authorisation should use "Bearer <token>" schema');
    })
    .end(done);
}

export function mustBeAValidToken(done) {
  supertest(app)
    .get(testEndPoint)
    .set('Authorization', 'Bearer not-a-valid-token')
    .expect(401)
    .expect(res => {
      assert.equal(res.body.message, 'jwt malformed');
    })
    .end(done);
}

export function dataShouldBeAddedToSuccesfulRequestAtPayloadPath(done) {
  const token = jwt.sign(payload, secret);
  supertest(app)
    .get(testEndPoint)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
    .end((err, response) => {

      assert.ok(response.body);
      assert.equal(response.body.email, 'test@email.com');
      assert.equal(response.body.username, 'user101');

      done();
    });
}
