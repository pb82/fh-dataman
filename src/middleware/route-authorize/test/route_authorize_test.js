import assert from 'assert';
import authorize from '../';
import fhconfig from 'fh-config';

var user = null;
const mockRes = {};
var mockReq = null;
const appGuid = '12345678';

module.exports = {
  'Test Route Authorization Middleware': {
    'before': function(done) {
      fhconfig.init('config/dev.json', () => {
        user = {
          entity: {
            guid: appGuid
          },
          permissions: [{
            businessObject: fhconfig.value('businessObjects')[0],
            permissions: {read: true}
          }]
        };
        mockReq = {
          method: 'GET',
          user: user,
          params: {
            appGuid: appGuid
          }
        };
        done();
      });
    },

    'Route Passes Authorization': function(done) {
      const middleware = authorize({permission: 'read'});

      middleware(mockReq, mockRes, err => {
        assert.ok(!err);
        done();
      });
    },

    'Route fails Authorization': function(done) {
      const middleware = authorize({permission: 'write'});

      middleware(mockReq, mockRes, err => {
        assert.ok(err);
        done();
      });
    },

    'Route Passes ReST Authorization': function(done) {
      const middleware = authorize();

      middleware(mockReq, mockRes, err => {
        assert.ok(!err);
        done();
      });
    },

    'Route fails ReST Authorization': function(done) {
      const middleware = authorize();

      mockReq.method = 'POST';
      middleware(mockReq, mockRes, err => {
        assert.ok(err);
        done();
      });
    }
  }
};
