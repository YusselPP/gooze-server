'use strict';

var debug = require('debug')('gooze:chat-socket-events');

var events = {
  sendMessage: 'sendMessage',
  messageReceived: 'messageReceived',
  messageReceivedAck: 'messageReceivedAck',

  requestAmount: 'requestAmount',
  amountRequestReceived: 'amountRequestReceived',

  retrieveHistory: 'retrieveHistory'
};

module.exports = function addChatSocketEvents(socket, clients, app) {
  var Chat = app.models.Chat;
  var ChatMessage = app.models.ChatMessage;
  var DateRequest = app.models.DateRequest;
  socket.on(events.sendMessage, handleSendMessage);

  socket.on(events.requestAmount, function(data, callback) {
    var error;
    var message = data[0];
    var username = data[1];
    var chatJson = data[2];
    var dateRequestId = data[3];
    var mode = data[4];
    var amount = data[5];

    DateRequest.findById(dateRequestId)
      .then(function(dateRequest) {
        if (!dateRequest) {
          debug('requestAmount - DateRequest not found');
          error = new Error('Request not found');
          error.statusCode = error.status = 404;
          error.code = 'REQUEST_NOT_FOUND';
          error.details = {
            dateRequestId: dateRequestId
          };
          throw error;
        }

        // TODO: Validate request status that allows amount updates.

        return dateRequest.updateAttribute('amount', amount);
      })
      .then(function(dateRequest) {
        var recipientSockets;
        debug('requestAmount - Amount persisted on DateRequest');

        debug('requestAmount - Emitting amount');
        recipientSockets = clients[dateRequest.senderId];
        if (Array.isArray(recipientSockets)) {
          recipientSockets.forEach(function(recipientSocket) {
            recipientSocket.emit(events.amountRequestReceived, dateRequest.toJSON(), function ack() {
              debug('requestAmount - Recipient has received the amount request');
            });
            debug('requestAmount - Successfully emitted: amountRequestReceived event');
          });
        } else {
          debug('requestAmount - Recipient socket not found on connected clients list. Amount request not emitted');
        }

        handleSendMessage([message, username, chatJson, dateRequestId, mode], function(err) {
          if (err) {
            debug('requestAmount - Failed to send amount message');
            return;
          }
          debug('requestAmount - Amount message sent successfully');
        });

        callback(null, true);
      })
      .catch(function(err) {
        console.error(err);
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
        return chat.messages({
          limit: 20,
          order: 'createdAt DESC'
        });
      })
      .then(function(chatMessages) {
        debug('retrieveHistory - Found messages: ' + JSON.stringify(chatMessages));

        callback(null, chatMessages.reverse());
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });
  });

  function handleSendMessage(data, callback) {
    debug('sendMessage - event received');
    debug(JSON.stringify(data));

    var recipientSockets, text, senderId, recipientId, error;
    var message = data[0];
    var username = data[1];
    var chatJson = data[2];
    var dateRequestId = data[3];
    var mode = data[4];

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

    if (chatJson.user1Id === senderId) {
      recipientId = chatJson.user2Id;
    } else {
      recipientId = chatJson.user1Id;
    }

    debug('sendMessage - Persisting message');
    ChatMessage.create({
      chatId: message.chatId,
      text: text,
      senderId: senderId,
      type: message.type,
      status: 'sent',
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    })
      .then(function(chatMessage) {
        var isStatusReceived = false;
        var chatMessageJson = chatMessage.toJSON();
        debug('sendMessage - Persisted message: ' + JSON.stringify(chatMessageJson));

        debug('sendMessage - Emitting message: ' + JSON.stringify(chatMessageJson));
        recipientSockets = clients[recipientId];
        if (Array.isArray(recipientSockets)) {
          recipientSockets.forEach(function(recipientSocket) {
            recipientSocket.emit(events.messageReceived, chatMessageJson, username, chatJson, dateRequestId, mode, function ack() {
              debug('sendMessage - Recipient has received the message');

              if (!isStatusReceived) {
                isStatusReceived = true;
                debug('sendMessage - Updating message status to received');
                chatMessage.updateAttribute('status', 'received')
                  .then(function(updatedChatMessage) {
                    debug('sendMessage - Message status updated: received');
                    var updatedChatMessageJson = updatedChatMessage.toJSON();

                    socket.emit(events.messageReceivedAck, updatedChatMessageJson);
                    debug('sendMessage - Successfully emitted: messageReceivedAck event');
                  }).catch(function(err) {
                    debug(err);
                  });
              }
            });
            debug('sendMessage - Successfully emitted: messageReceived event');
          });
        } else {
          debug('sendMessage - Recipient socket not found on connected clients list. Message not emitted');
        }

        callback(null, chatMessageJson);
      })
      .catch(function(err) {
        debug(err);
        callback(err);
      });
  }
};
