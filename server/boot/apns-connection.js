/**
 * Created by yparedes on 6/18/18.
 */
'use strict';

var apns = require('../../common/services/apns/apns-service');

module.exports = function(server) {
  server.apnsProvider = apns.connect();
};

