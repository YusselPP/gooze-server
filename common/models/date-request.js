'use strict';

var debug = require('debug')('gooze:date-request');

/**
 *
 * @param DateRequest{DateRequest}
 */
module.exports = function(DateRequest) {
  DateRequest.validatesInclusionOf('status', {in: ['sent', 'received', 'accepted', 'rejected']});
};
