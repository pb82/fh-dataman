use admin;
db.addUser({
  user: "admin",
  pwd: "admin",
  roles: [
    "userAdminAnyDatabase",
    "dbAdminAnyDatabase",
    "readWriteAnyDatabase"
  ]
});
