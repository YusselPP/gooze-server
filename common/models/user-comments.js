'use strict';

var debug = require('debug')('gooze:user-comments');

/**
 *
 * @param UserComments{UserComments}
 */
module.exports = function(UserComments) {
  UserComments.validatesPresenceOf('commentId');
};
