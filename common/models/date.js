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
      starting: 'starting',
      ending: 'ending',
      ended: 'ended',
      canceled: 'canceled'
    }
  };

  GZEDate.validatesInclusionOf('status', {in: Object.keys(GZEDate.constants.status)});
};
