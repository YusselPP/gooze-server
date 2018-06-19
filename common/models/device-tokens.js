'use strict';

var debug = require('debug')('gooze:device-tokens');

/**
 *
 * @param DeviceToken{DeviceToken}
 */
module.exports = function(DeviceToken) {
  DeviceToken.validatesPresenceOf('userId');
};
