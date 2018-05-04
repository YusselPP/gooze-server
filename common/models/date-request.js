'use strict';

var debug = require('debug')('gooze:date-request');

/**
 *
 * @param DateRequest{DateRequest}
 */
module.exports = function(DateRequest) {
  DateRequest.constants = {
    status: {
      sent: 'sent',
      received: 'received',
      accepted: 'accepted',
      onDate: 'onDate',
      rejected: 'rejected',
      ended: 'ended'
    }
  };

  DateRequest.validatesInclusionOf('status', {in: Object.keys(DateRequest.constants.status)});
  DateRequest.validatesPresenceOf('senderId', 'recipientId');
};
