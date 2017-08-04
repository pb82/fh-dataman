//conf-docker.json is generated from this in the Dockerfile
var placeholders = {
  "mbaasType": "openshift",
  "https.enabled": false,
  "port": "{{env.FH_DATAMAN_PORT}}",
  "sizeLimit": 0,
  "logger.streams[0].level": "{{env.FH_LOG_LEVEL}}",
  "logger.streams[1].level": "{{env.FH_LOG_LEVEL}}",
  "auth.secret": "{{env.FHMBAAS_KEY}}",
  "businessObjects": [
    "cluster/reseller/customer/domain/service/data-browser",
    "cluster/reseller/customer/domain/project/client-apps/data-browser",
    "cluster/reseller/customer/domain/project/cloud-apps/data-browser"
  ],
  "mbaas.url": "{{env.FHMBAAS_URL}}",
  "mbaas.password": "{{env.MONGODB_FHMBAAS_PASSWORD}}",
  "mbaas.username": "{{env.MONGODB_FHMBAAS_USER}}"
};

module.exports = placeholders;
