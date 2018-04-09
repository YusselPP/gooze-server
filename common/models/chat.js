'use strict';

var debug = require('debug')('gooze:chat');

/**
 *
 * @param Chat{Chat}
 */
module.exports = function(Chat) {
  Chat.validatesInclusionOf('status', {in: ['active', 'ended']});
};
