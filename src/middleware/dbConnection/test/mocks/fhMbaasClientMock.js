/**
 * Mock function to dictate the behaviour of
 * the MbaasClient function in 'fh-mbaas-client'
 *
 * @param {object} appEnvVarsStub
 * @param {object} primaryNodeStub
 */
module.exports = (appEnvVarsStub, primaryNodeStub, dbConnectionStub) => function MbaasClient() {
  return {
    admin: {
      apps: {
        envVars: {
          get: appEnvVarsStub
        },
        mongoPrimary: primaryNodeStub
      }
    },
    app: {
      databaseConnectionString: dbConnectionStub
    }
  };
};
