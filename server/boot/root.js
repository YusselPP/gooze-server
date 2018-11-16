
module.exports = function(server) {
  console.log(process.env.NODE_ENV);

  var RoleMapping = server.models.RoleMapping;
  var ObjectID = RoleMapping.getDataSource().connector.getDefaultIdType();

// Because of this: https://github.com/strongloop/loopback-connector-mongodb/issues/1441
  RoleMapping.defineProperty('principalId', {
    type: ObjectID,
  });
};
