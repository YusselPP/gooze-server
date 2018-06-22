'use strict';

var debug = require('debug')('gooze:chat-message');

/**
 *
 * @param ChatMessage{ChatMessage}
 */
module.exports = function(ChatMessage) {

  ChatMessage.constants = {
    types: {
      info: 'info',
      user: 'user'
    },
    status: {
      sent: 'sent',
      received: 'received',
      read: 'read'
    }
  };

  ChatMessage.validatesInclusionOf('type', {in: Object.keys(ChatMessage.constants.types)});
  ChatMessage.validatesInclusionOf('status', {in: Object.keys(ChatMessage.constants.status)});
  ChatMessage.validatesPresenceOf('senderId', 'chatId');

  ChatMessage.prototype.gzeLocalizedText = function() {
    var message = this;

    if (message.type === ChatMessage.constants.types.info) {
      var textArr = message.text.split('|');

      var textKey = textArr.shift();

      return {text: textKey, args: textArr};
    }

    return {text: message.text};
  };
};
