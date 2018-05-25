'use strict';

var debug = require('debug')('gooze:dates-socket-events');

var oneChatPerRequest = true;

var events = {
  findRequestById: 'findRequestById',

  dateRequestSent: 'dateRequestSent',
  dateRequestReceived: 'dateRequestReceived',
  dateRequestReceivedAck: 'dateRequestReceivedAck',

  acceptRequest: 'acceptRequest',
  requestAccepted: 'requestAccepted',

  createCharge: 'createCharge',
  createChargeSuccess: 'createChargeSuccess',

  updateLocation: 'updateLocation',
  locationUpdateReceived: 'locationUpdateReceived',

  dateStarted: 'dateStarted',
  dateEnded: 'dateEnded'
};

module.exports = function addDatesSocketEvents(socket, clients, app, channel) {
  var Chat = app.models.Chat;
  var DateRequest = app.models.DateRequest;
  var GoozeUser = app.models.GoozeUser;
  var GZEDate = app.models.GZEDate;

  channel.customService = {
    updateLocation: updateLocation,
    emitDateStarted: emitDateStarted,
    emitDateEnded: emitDateEnded
  };

  socket.on(events.findRequestById, function(data, callback) {
    var error;
    var requestId = data[0];

    debug('findRequestById - Retrieving request id: ' + requestId);
    DateRequest.findById(requestId)
      .then(function(dateRequest) {
        if (!dateRequest) {
          debug('findRequestById - DateRequest not found');
          error = new Error('Request not found');
          error.statusCode = error.status = 404;
          error.code = 'REQUEST_NOT_FOUND';
          error.details = {
            dateRequestId: requestId
          };
          throw error;
        }
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
        recipientClosed: false,
        or: [
          {status: DateRequest.constants.status.sent},
          {status: DateRequest.constants.status.received},
          {status: DateRequest.constants.status.accepted},
          {status: DateRequest.constants.status.onDate}
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
            GoozeUser.publicProfile(recipientId)
          ])
        );
      })
      .then(function(promisesResult) {
        var sender = promisesResult[0];

        return DateRequest.create({
          senderId: senderId,
          recipientId: recipientId,
          status: DateRequest.constants.status.sent,
          location: sender.dateLocation
        }).then(function(dateRequest) {
          promisesResult.push(dateRequest);

          return promisesResult;
        });
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
        var findChatPromise;
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

        if (oneChatPerRequest) {
          findChatPromise = Promise.resolve(null);
        } else {
          findChatPromise = Chat.findOne(
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
          );
        }

        return (
          findChatPromise
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

  socket.on(events.createCharge, function(data, callback) {
    var funcName = 'createCharge';
    debug(funcName + ' - event received');
    var chatService = app.chatSocketChannel.customService;
    var error, date;
    var dateRequestId = data[0];

    var message = data[1];
    var username = data[2];
    var chatJson = data[3];
    var mode = data[4];

    DateRequest.findById(dateRequestId)
      .then(function(dateRequest) {
        if (!dateRequest) {
          debug(funcName + ' - Request not found');
          error = new Error('Request not found');
          error.statusCode = error.status = 404;
          error.code = 'REQUEST_NOT_FOUND';
          error.details = {
            dateRequestId: dateRequestId
          };
          throw error;
        }

        var dateRequestJson = dateRequest.toJSON();

        debug(funcName + ' - creating date');
        return (
          Promise.all([
            GZEDate.create()
              .then(function(createdDate) {
                date = createdDate;
                debug(funcName + ' - assigned date: id=' + createdDate.id);
                debug(funcName + ' - linking date with date request id=' + dateRequest.id);
                return dateRequest.updateAttributes({
                  dateId: createdDate.id,
                  status: DateRequest.constants.status.onDate
                });
              }),
            GoozeUser.updateAll(
              {
                id: socket.userId
              },
              {
                status: GoozeUser.constants.status.onDate,
                mode: mode === 'client' ? 'gooze' : 'client'
              }),
            GoozeUser.updateAll(
              {
                id: dateRequestJson.recipient && dateRequestJson.recipient.id
              },
              {
                status: GoozeUser.constants.status.onDate,
                mode: mode
              })
          ])
        );
      })
      .then(function(result) {
        var dateRequest = result[0];
        var recipientSockets, recipientId;
        var dateRequestJson = dateRequest.toJSON();

        dateRequestJson.date = date.toJSON();
        recipientId = dateRequestJson.recipient && dateRequestJson.recipient.id;

        debug(funcName + 'date request updated');
        debug(funcName + 'updated request: ' + dateRequestJson);
        debug(funcName + ' - Emitting createChargeSuccess event to [id=' + recipientId + ']');
        recipientSockets = clients[recipientId];
        if (Array.isArray(recipientSockets)) {
          recipientSockets.forEach(function(recipientSocket) {
            recipientSocket.emit(events.createChargeSuccess, dateRequestJson, function ack() {
              // recipient has received requestAccepted event
              debug(funcName + ' - createChargeSuccess event has been received');
            });
            debug(funcName + ' - Successfully emitted: createChargeSuccess event');
          });
        } else {
          debug(funcName + ' - Recipient socket not found on connected clients list. createChargeSuccess not emitted');
        }

        chatService.sendMessage([message, username, chatJson, dateRequestId, mode], function(err) {
          if (err) {
            debug(funcName + ' - Failed to send createChargeSuccess message');
            return;
          }
          debug(funcName + ' - createChargeSuccess message sent successfully');
        });

        callback(null, dateRequestJson);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });

    debug(funcName + ' - Creating charge');
  });

  socket.on(events.updateLocation, updateLocation);

  function updateLocation(data, callback) {
    var funcName = 'updateLocation';
    debug(funcName + ' - event received');
    var error, recipientSockets;
    var recipientId = data[0];
    var user = data[1];

    debug(user);

    GoozeUser.updateAll(
      {
        id: user.id
      },
      {
        currentLocation: user.currentLocation
      }).then(function() {
        debug(funcName + 'user location persisted');
      }).catch(function(reason) {
        console.error(funcName + ' failed to persist user. ' + reason);
      });

    debug(funcName + ' - Emitting locationUpdateReceived event to [id=' + recipientId + ']');
    recipientSockets = clients[recipientId];
    if (Array.isArray(recipientSockets)) {
      recipientSockets.forEach(function(recipientSocket) {
        recipientSocket.emit(events.locationUpdateReceived, user, function ack() {
          debug(funcName + ' - locationUpdateReceived event has been received');
        });
        debug(funcName + ' - Successfully emitted: locationUpdateReceived event');
      });
    } else {
      debug(funcName + ' - Recipient socket not found on connected clients list. locationUpdateReceived not emitted');
    }
    callback(null, true);
  }

  function emitDateStarted(toUserId, dateRequest) {
    var recipientSockets;

    if (!toUserId) {
      console.error('emitStartDate - undefined toUserId, .dateStarted event wont be emitted');
      return;
    }

    recipientSockets = clients[toUserId];

    if (Array.isArray(recipientSockets)) {
      recipientSockets.forEach(function(recipientSocket) {
        recipientSocket.emit(events.dateStarted, dateRequest, function ack() {
          debug('emitStartDate - .dateStarted has been received');
        });
        debug('emitStartDate - Successfully emitted: .dateStarted event');
      });
    } else {
      debug('emitStartDate - Recipient socket not found on connected clients list. dateStarted event not emitted');
    }
  }

  function emitDateEnded(toUserId, dateRequest) {
    var recipientSockets;

    if (!toUserId) {
      console.error('emitDateEnded - undefined toUserId, .dateEnded event wont be emitted');
      return;
    }

    recipientSockets = clients[toUserId];

    if (Array.isArray(recipientSockets)) {
      recipientSockets.forEach(function(recipientSocket) {
        recipientSocket.emit(events.dateEnded, dateRequest, function ack() {
          debug('emitDateEnded - .dateEnded has been received');
        });
        debug('emitDateEnded - Successfully emitted: .dateEnded event');
      });
    } else {
      debug('emitDateEnded - Recipient socket not found on connected clients list. dateEnded event not emitted');
    }
  }
};
