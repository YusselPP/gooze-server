'use strict';

var debug = require('debug')('gooze:chat-message');

/**
 *
 * @param ChatMessage{ChatMessage}
 */
module.exports = function(ChatMessage) {
  ChatMessage.validatesInclusionOf('type', {in: ['info', 'user']});
  ChatMessage.validatesInclusionOf('status', {in: ['sent', 'received', 'read']});
  ChatMessage.validatesPresenceOf('senderId', 'chatId');
};
