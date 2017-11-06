'use strict';

module.exports = function(app) {
  var uuid = require('uuid');
  app.dataSources.storage.connector.getFilename = function(file, req, res) {
    var origFilename = file.name;
    var parts = origFilename.split('.');
    var extension = parts[parts.length - 1];

    var newFilename =  uuid.v1() + '.' + extension;
    return req.accessToken.userId + '_' + newFilename;
  };
};
