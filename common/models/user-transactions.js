'use strict';

var debug = require('debug')('gooze:gooze-access-token');

/**
 *
 * @param UserTransaction{UserTransaction}
 */
module.exports = function(UserTransaction) {
  UserTransaction.validatesPresenceOf('dateRequestId');
  UserTransaction.validatesPresenceOf('fromUserId');
  UserTransaction.validatesPresenceOf('toUserId');
};
