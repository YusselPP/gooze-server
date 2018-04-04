'use strict';

var debug = require('debug')('gooze:chat-socket-events');

var events = {
  sendMessage: 'sendMessage',
  messageReceived: 'messageReceived',
};

module.exports = function addChatSocketEvents(socket, clients, app) {
  socket.on(events.sendMessage, function(data, callback) {
    debug('sendMessage - event received');
    debug(JSON.stringify(data));

    var message = data[0];
    var recipientSocket;

    recipientSocket = clients[message.recipient.id];
    if (recipientSocket) {
      recipientSocket.emit(events.messageReceived, message, function ack() {
        debug('Recipient has received the message');
      });
    }

    callback();
  });
};
