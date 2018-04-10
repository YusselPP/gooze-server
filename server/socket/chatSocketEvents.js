'use strict';

var debug = require('debug')('gooze:chat-socket-events');

var events = {
  sendMessage: 'sendMessage',
  messageReceived: 'messageReceived',
  messageReceivedAck: 'messageReceivedAck',

  retrieveHistory: 'retrieveHistory'
};

module.exports = function addChatSocketEvents(socket, clients, app) {
  var Chat = app.models.Chat;
  var ChatMessage = app.models.ChatMessage;
  socket.on(events.sendMessage, function(data, callback) {
    debug('sendMessage - event received');
    debug(JSON.stringify(data));

    var recipientSocket, text, senderId, recipientId, error;
    var message = data[0];
    var username = data[1];

    if (typeof message !== 'object') {
      debug('sendMessage - Invalid message');
      error = new Error('Invalid message');
      error.statusCode = error.status = 400;
      error.code = 'BAD_REQUEST';
      callback(error);
      return;
    }

    text = message.text;
    senderId = message.senderId;
    recipientId = message.recipientId;

    debug('sendMessage - Persisting message');
    ChatMessage.create({
      text: text,
      senderId: senderId,
      recipientId: recipientId,
      type: message.type,
      status: 'sent',
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    })
      .then(function(chatMessage) {
        var chatMessageJson = chatMessage.toJSON();
        debug('sendMessage - Persisted message: ' + JSON.stringify(chatMessageJson));

        // chatMessageJson.sender = message.sender;
        // chatMessageJson.recipient = message.recipient;

        debug('sendMessage - Emitting message: ' + JSON.stringify(chatMessageJson));
        recipientSocket = clients[recipientId];
        if (recipientSocket) {
          recipientSocket.emit(events.messageReceived, chatMessageJson, username, function ack() {
            debug('sendMessage - Recipient has received the message');

            debug('sendMessage - Updating message status to received');
            chatMessage.updateAttribute('status', 'received')
              .then(function(updatedChatMessage) {
                debug('sendMessage - Message status updated: received');
                var updatedChatMessageJson = updatedChatMessage.toJSON();

                // updatedChatMessageJson.sender = message.sender;
                // updatedChatMessageJson.recipient = message.recipient;

                socket.emit(events.messageReceivedAck, updatedChatMessageJson);
                debug('sendMessage - Successfully emitted: messageReceivedAck event');
              }).catch(function(err) {
                debug(err);
              });
          });
          debug('sendMessage - Successfully emitted: messageReceived event');
        } else {
          debug('sendMessage - Recipient socket not found on connected clients list. Message not emitted');
        }

        callback(null, chatMessageJson);
      })
      .catch(function(err) {
        debug(err);
        callback(err);
      });
  });

  // TODO: Create chat when request accepted. Create Date when payment success
  // request --(request.accepted)--> chat --(payment.success)--> date
  // request --(request.canceled|rejected)--/
  // chat --(chat.closed)--/
  // date --(canceled|ended)--/
  socket.on(events.retrieveHistory, function(data, callback) {
    var chatId = data[0];

    debug('retrieveHistory - Retrieving messages from chatId: ' + chatId);
    Chat.findById(chatId)
      .then(function(chat) {
        return ChatMessage.find({
          where: {
            or: [
              {
                and: [{senderId: chat.owner.id}, {recipientId: chat.recipient.id}]
              },
              {
                and: [{senderId: chat.recipient.id}, {recipientId: chat.owner.id}]
              }
            ]
          },
          limit: 20,
          order: 'createdAt DESC'
        });
      })
      .then(function(chatMessages) {
        return chatMessages.sort(function(a, b) {
          return a.createdAt - b.createdAt;
        });
      })
      .then(function(chatMessages) {
        var chatMessagesJson = chatMessages.toJSON();
        debug('retrieveHistory - Found messages: ' + JSON.stringify(chatMessagesJson));

        callback(null, chatMessagesJson);
      })
      .catch(function(err) {
        debug(err);
        callback(err);
      });
  });
};
