'use strict';

var debug = require('debug')('gooze:dates-socket-events');

var events = {
  findRequestById: 'findRequestById',

  dateRequestSent: 'dateRequestSent',
  dateRequestReceived: 'dateRequestReceived',
  dateRequestReceivedAck: 'dateRequestReceivedAck',

  acceptRequest: 'acceptRequest',
  requestAccepted: 'requestAccepted'
};

module.exports = function addDatesSocketEvents(socket, clients, app) {
  var Chat = app.models.Chat;
  var DateRequest = app.models.DateRequest;
  var GoozeUser = app.models.GoozeUser;

  socket.on(events.findRequestById, function(data, callback) {
    var requestId = data[0];

    debug('findRequestById - Retrieving request id: ' + requestId);
    DateRequest.findById(requestId)
      .then(function(dateRequest) {
        callback(null, dateRequest);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });
  });

  socket.on(events.dateRequestSent, function(data, callback) {
    debug('dateRequestSent - event received');
    var error;
    var senderId = socket.userId;
    var recipientId = data[0];

    if ((typeof recipientId) !== 'string' || recipientId === '') {
      debug('dateRequestSent - Invalid user id: ' + recipientId);
      error = new Error('Invalid user id');
      error.statusCode = error.status = 422;
      error.code = 'MISSING_REQUIRED_FIELD';
      error.details = {
        field: 'userId'
      };
      callback(error);
      return;
    }

    debug(
      'dateRequestSent - Sending request from user.id: ' +
      senderId + ', to user.id: ' + recipientId
    );

    DateRequest.find({
      where: {
        senderId: senderId,
        recipientId: recipientId,
        or: [
          {status: DateRequest.constants.status.sent},
          {status: DateRequest.constants.status.received},
          {status: DateRequest.constants.status.accepted}
        ]
      }
    })
      .then(function(dateRequests) {
        if (dateRequests.length > 0) {
          debug('dateRequestSent - You have already sent a request to this user. Waiting for the user answer');
          error = new Error('You have already sent a request to this user. Waiting for the user answer');
          error.statusCode = error.status = 409;
          error.code = 'DATE_REQUEST_ALREADY_SENT';
          throw error;
        }

        return (
          Promise.all([
            GoozeUser.publicProfile(senderId),
            GoozeUser.publicProfile(recipientId),
            DateRequest.create({
              senderId: senderId,
              recipientId: recipientId,
              status: DateRequest.constants.status.sent
            })
          ])
        );
      })
      .then(function(promisesResult) {
        var sender = promisesResult[0];
        var recipient = promisesResult[1];
        var dateRequest = promisesResult[2];
        var recipientSockets;

        var isDateRequestReceived = false;
        var sentRequest = dateRequest.toJSON();
        var receivedRequest = dateRequest.toJSON();

        sentRequest.sender = sender;
        sentRequest.recipient = recipient;
        receivedRequest.sender = sender;
        receivedRequest.recipient = recipient;
        receivedRequest.status = DateRequest.constants.status.received;
        debug('dateRequestSent - DateRequest persisted ' + JSON.stringify(dateRequest));
        debug('dateRequestSent - Sender public profile ' + JSON.stringify(sender));
        debug('dateRequestSent - Recipient ' + JSON.stringify(recipient));

        debug('dateRequestSent - Emitting dateRequestReceived event to [id=' + recipientId + ']');
        recipientSockets = clients[recipientId];
        if (Array.isArray(recipientSockets)) {
          recipientSockets.forEach(function(recipientSocket) {
            recipientSocket.emit(events.dateRequestReceived, receivedRequest, function ack() {
              // Recipient has received the request
              debug('date request has been received');
              // Also add a hook to the method that query date request
              // in order to update the request state when the recipient user is not connected
              if (!isDateRequestReceived) {
                isDateRequestReceived = true;

                dateRequest.updateAttribute('status', DateRequest.constants.status.received)
                  .then(function(updatedDateRequest) {
                    debug('date request status updated: received');
                    var updatedRequestJson = updatedDateRequest.toJSON();
                    updatedRequestJson.sender = sender;
                    updatedRequestJson.recipient = recipient;
                    socket.emit(events.dateRequestReceivedAck, updatedRequestJson);
                  }).catch(function(err) {
                    debug(err);
                  });
              }
            });
            debug('dateRequestSent - Successfully emitted: dateRequestReceived event');
          });
        } else {
          debug('dateRequestSent - Recipient socket not found on connected clients list. DateRequest not emitted');
        }
        callback(null, sentRequest);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });
  });

  socket.on(events.acceptRequest, function(data, callback) {
    debug('acceptRequest - event received');
    var error, chat;
    var dateRequestId = data[0];

    DateRequest.findById(dateRequestId)
      .then(function(dateRequest) {
        if (!dateRequest) {
          debug('acceptRequest - Request not found');
          error = new Error('Request not found');
          error.statusCode = error.status = 404;
          error.code = 'REQUEST_NOT_FOUND';
          error.details = {
            dateRequestId: dateRequestId
          };
          throw error;
        }

        if (
          dateRequest.status !== DateRequest.constants.status.sent &&
          dateRequest.status !== DateRequest.constants.status.received
        ) {
          debug('acceptRequest - Request can\'t be accepted');
          error = new Error('Request can\'t be accepted');
          error.statusCode = error.status = 409;
          error.code = 'REQUEST_INVALID_STATUS';
          error.details = {
            current: dateRequest.status,
            needed: DateRequest.constants.status.sent + ' or ' + DateRequest.constants.status.received
          };
          throw error;
        }
        debug('acceptRequest - accepting date request: ' + JSON.stringify(dateRequest.toJSON()));

        debug('acceptRequest - creating chat');
        return (
          Chat.findOne(
            {
              where: {
                or: [
                  {
                    user1Id: dateRequest.senderId,
                    user2Id: dateRequest.recipientId
                  },
                  {
                    user1Id: dateRequest.recipientId,
                    user2Id: dateRequest.senderId
                  }
                ]
              }
            }
          )
            .then(function(foundChat) {
              if (foundChat) {
                debug('acceptRequest - chat found');
                return foundChat;
              }
              debug('acceptRequest - chat not found, creating it');

              return Chat.create({
                user1Id: dateRequest.senderId,
                user2Id: dateRequest.recipientId
              });
            })
            .then(function(createdChat) {
              chat = createdChat;
              debug('acceptRequest - assigned chat: id=' + createdChat.id);
              debug('acceptRequest - updating request status and chat: id=' + dateRequest.id);
              return dateRequest.updateAttributes({
                chatId: createdChat.id,
                status: DateRequest.constants.status.accepted
              });
            })
        );
      })
      .then(function(dateRequest) {
        var senderSockets, senderId;
        var dateRequestJson = dateRequest.toJSON();

        dateRequestJson.chat = chat.toJSON();
        senderId = dateRequestJson.sender && dateRequestJson.sender.id;

        debug('date request status updated: ' + JSON.stringify(dateRequestJson));
        debug('acceptRequest - Emitting requestAccepted event to [id=' + senderId + ']');
        senderSockets = clients[senderId];
        if (Array.isArray(senderSockets)) {
          senderSockets.forEach(function(senderSocket) {
            senderSocket.emit(events.requestAccepted, dateRequestJson, function ack() {
              // Sender has received requestAccepted event
              debug('acceptRequest - requestAccepted event has been received');
            });
            debug('acceptRequest - Successfully emitted: requestAccepted event');
          });
        } else {
          debug('acceptRequest - Sender socket not found on connected clients list. requestAccepted not emitted');
        }
        callback(null, dateRequestJson);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });

    debug('acceptRequest - Accepting request: ' + dateRequestId);
  });
};
