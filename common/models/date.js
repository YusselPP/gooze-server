'use strict';

var debug = require('debug')('gooze:date');

/**
 *
 * @param GZEDate{GZEDate}
 */
module.exports = function(GZEDate) {
  GZEDate.constants = {
    status: {
      route: 'route',
      progress: 'progress',
      canceled: 'canceled',
      ended: 'ended'
    }
  };

  GZEDate.validatesInclusionOf('status', {in: Object.keys(GZEDate.constants.status)});
};
