export function sysPingEndpoint(server) {
  server.get("/sys/info/ping", (req, res, next) => {
    res.send("Ok");
  });
}

export function sysHealthEndpoint(server) {
  server.get("/sys/info/health", (req, res, next) => {
    res.json({"http": "ok"});
  });
}

function buildSysEndPoints(server) {
  sysPingEndpoint(server);
  sysHealthEndpoint(server);
}

export default buildSysEndPoints;
