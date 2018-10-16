var debug = require('debug')('gooze:dates-socket-events');
var apns = require('../../common/services/apns/apns-service');

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
  dateEnded: 'dateEnded',
  dateStatusChanged: 'dateStatusChanged',

  userChanged: 'userChanged'
};

module.exports = function addDatesSocketEvents(socket, clients, app, channel) {
  var Chat = app.models.Chat;
  var DateRequest = app.models.DateRequest;
  var GoozeUser = app.models.GoozeUser;
  var GZEDate = app.models.GZEDate;

  channel.customService = {
    updateLocation: updateLocation,
    createCharge: createCharge,
    emitDateStatusChanged: emitDateStatusChanged,
    emitUserChanged: emitUserChanged
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

    GoozeUser.findById(senderId)
      .then(function(user) {
        if (!user) {
          debug('dateRequestSent - User not found, id: ' + senderId);
          error = new Error('Invalid user id');
          error.statusCode = error.status = 422;
          error.code = 'MODEL_NOT_FOUND';
          error.details = {
            model: 'user'
          };
          throw error;
        }
        const userJson = user.toJSON();

        debug('dateRequestSent - payment: ', userJson.payment);
        // Payment method validation
        if (!userJson.payment || !userJson.payment.paypalCustomerId) {
          error = new Error('A payment method is required');
          error.statusCode = error.status = 422;
          error.code = 'PAYMENT_METHOD_REQUIRED';
          error.details = {};
          throw error;
        }

        return DateRequest.find({
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
        });
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
      .then(function([sender, recipient]) {
        debug('dateRequestSent - creating chat');
        let findChatPromise;

        if (oneChatPerRequest) {
          findChatPromise = Promise.resolve(null);
        } else {
          findChatPromise = Chat.findOne(
            {
              where: {
                or: [
                  {
                    user1Id: senderId,
                    user2Id: recipientId
                  },
                  {
                    user1Id: recipientId,
                    user2Id: senderId
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
                user1Id: senderId,
                user2Id: recipientId
              });
            })
            .then((chat) => [sender, recipient, chat])
        );
      })
      .then(function([sender, recipient, chat]) {
        return DateRequest.create({
          chatId: chat.id,
          senderId: senderId,
          recipientId: recipientId,
          status: DateRequest.constants.status.sent,
          location: sender.dateLocation
        }).then(function(dateRequest) {
          return [sender, recipient, dateRequest];
        });
      })
      .then(function([sender, recipient, dateRequest]) {
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

        apns.send(app.apnsProvider, recipientId, {
          alert: {
            'loc-key': 'service.dates.requestReceived',
            'loc-args': [sentRequest.sender.username]
          },
          badge: 1
        });

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

        return (
          GoozeUser.findById(dateRequest.recipientId)
            .then((recipient) => {
              if (!recipient) {
                debug('acceptRequest - User not found, id: ' + dateRequest.recipientId);
                error = new Error('User not found');
                error.statusCode = error.status = 404;
                error.code = 'MODEL_NOT_FOUND';
                error.details = {
                  model: 'GoozeUser',
                  id: dateRequest.recipientId
                };
                throw error;
              }

              return [dateRequest, recipient];
            })
        );
      })
      .then(function([dateRequest, recipient]) {
        const userJson = recipient.toJSON();

        debug('dateRequestSent - payment: ', userJson.payment);
        // Payment method validation
        if (!userJson.payment || !userJson.payment.paypalCustomerId) {
          error = new Error('A payment method is required');
          error.statusCode = error.status = 422;
          error.code = 'PAYMENT_METHOD_REQUIRED';
          error.details = {};
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

        return dateRequest.updateAttributes({
          status: DateRequest.constants.status.accepted
        });
      })
      .then(function(dateRequest) {
        var senderSockets, senderId;
        var dateRequestJson = dateRequest.toJSON();

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

        apns.send(app.apnsProvider, senderId, {
          alert: {
            'loc-key': 'service.dates.requestAccepted',
            'loc-args': [dateRequestJson.recipient.username]
          },
          badge: 1
        });

        callback(null, dateRequestJson);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });

    debug('acceptRequest - Accepting request: ' + dateRequestId);
  });

  socket.on(events.createCharge, createCharge);

  socket.on(events.updateLocation, updateLocation);

  function createCharge(data, callback) {
    var error, date;
    var funcName = 'createCharge';
    var dateRequestId = data[0];
    var message = data[1];
    var username = data[2];
    var chatJson = data[3];
    var mode = data[4];
    var chatService = app.chatSocketChannel.customService;

    debug(funcName + ' - data:', data);

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
        var senderId = dateRequestJson.sender && dateRequestJson.sender.id;
        var recipientId = dateRequestJson.recipient && dateRequestJson.recipient.id;

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

            GoozeUser.updateById(senderId,
              {
                status: GoozeUser.constants.status.onDate,
                mode: mode === 'client' ? 'gooze' : 'client',
                activeUntil: null,
                activeDateRequestId: dateRequest.id
              })
              .then(function(user) {
                return user.reload();
              }),
            GoozeUser.updateById(recipientId,
              {
                status: GoozeUser.constants.status.onDate,
                mode: mode,
                activeUntil: null,
                activeDateRequestId: dateRequest.id
              })
              .then(function(user) {
                return user.reload();
              })
          ])
        );
      })
      .then(function([dateRequest, sender, recipient]) {
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
            recipientSocket.emit(events.createChargeSuccess, dateRequestJson, recipient, function ack() {
              // recipient has received requestAccepted event
              debug(funcName + ' - createChargeSuccess event has been received');
            });
            debug(funcName + ' - Successfully emitted: createChargeSuccess event');
          });
        } else {
          debug(funcName + ' - Recipient socket not found on connected clients list. createChargeSuccess not emitted');
        }

        chatService.sendMessage([message, username, chatJson, dateRequestJson, mode], function(err) {
          if (err) {
            debug(funcName + ' - Failed to send createChargeSuccess message');
            return;
          }
          debug(funcName + ' - createChargeSuccess message sent successfully');
        });

        callback(null, dateRequestJson, sender);
      })
      .catch(function(err) {
        console.error(err);
        callback(err);
      });

    debug(funcName + ' - Creating charge');
  }

  function updateLocation(data, callback) {
    var funcName = 'updateLocation';
    debug(funcName + ' - event received');
    var error, recipientSockets;
    var promise = Promise.resolve();
    var recipientId = data[0];
    var user = data[1];
    var isArriving = data[2];
    var dateRequestId = data[3];

    debug(user, isArriving);

    if (isArriving) {
      debug(funcName + ' - user is arriving to date location');

      promise = sendArrivingNotification(user, recipientId, dateRequestId);
    }

    promise.then(function() {
      return (
        GoozeUser.updateAll(
          {
            id: user.id
          },
          {
            currentLocation: user.currentLocation,
            currentLoc: [user.currentLocation.lng, user.currentLocation.lat]
          })
      );
    })
    .then(function() {
      debug(funcName + ' - user location persisted');
    }).catch(function(reason) {
      console.error(funcName + ' - failed to persist user. ' + reason);
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

  function sendArrivingNotification(user, recipientId, dateRequestId) {
    var error, arrivingProp;
    var funcName = 'sendArrivingNotification';

    return (
      DateRequest.findById(dateRequestId)
      .then(function(dateRequest) {
        var updatePromise = Promise.resolve(dateRequest);
        var attr = {};
        if (!dateRequest) {
          debug(funcName + ' - Date request not found');
          error = new Error('Date request not found');
          error.statusCode = error.status = 404;
          error.code = 'DATE_REQUEST_NOT_FOUND';
          throw error;
        }

        var dateRequestJson = dateRequest.toJSON();

        debug(dateRequestJson, dateRequestJson.sender, typeof dateRequestJson.sender.id);

        if (dateRequestJson.sender && dateRequestJson.sender.id.toJSON() === user.id) {
          arrivingProp = 'senderArriving';
        } else if (dateRequestJson.recipient && dateRequestJson.recipient.id.toJSON() === user.id) {
          arrivingProp = 'recipientArriving';
        } else {
          console.error(funcName + ' - Couldn\'t determine user mode');
        }

        debug(funcName + ' - checking whether arriving notification has been sent');
        if (!dateRequest[arrivingProp]) {
          debug(funcName + ' - notification has not been sent. sending...');
          attr[arrivingProp] = true;

          updatePromise = dateRequest.updateAttributes(attr);

          apns.send(app.apnsProvider, recipientId, {
            alert: {
              'loc-key': 'vm.map.date.arriving',
              'loc-args': [user.username]
            },
            badge: 1,
            payload: {
              showInApp: true
            }
          });
          debug(funcName + ' - push notification sent');
        }

        return updatePromise;
      })
    );
  }

  function emitDateStatusChanged(toUserId, dateRequest, user) {
    var recipientSockets;

    debug('emitDateStatusChanged - toUserId:', toUserId, ', dateRequest.id', dateRequest.id);

    if (!toUserId) {
      console.error('emitDateStatusChanged - undefined toUserId, .dateStatusChanged event wont be emitted');
      return;
    }

    recipientSockets = clients[toUserId];

    if (Array.isArray(recipientSockets)) {
      recipientSockets.forEach(function(recipientSocket) {
        recipientSocket.emit(events.dateStatusChanged, dateRequest, user, function ack() {
          debug('emitDateStatusChanged - .dateStatusChanged has been received');
        });
        debug('emitDateStatusChanged - Successfully emitted: .dateStatusChanged event');
      });
    } else {
      debug('emitDateStatusChanged - Recipient socket not found on connected clients list. dateStatusChanged event not emitted');
    }
  }

  function emitUserChanged(userIds, user) {
    const funcName = emitUserChanged.name + ' -';
    let recipientSockets;

    if (Array.isArray(userIds)) {
      console.error(
        funcName, 'userIds must be an array, found[type=' + (typeof userIds) + ']. .userChanged event wont be emitted'
      );
      return;
    }

    recipientSockets = (
      userIds.reduce((result, userId) => {
        let userSockets = clients[userId];

        if (!Array.isArray(userSockets)) {
          return result;
        }

        return [...result, ...userSockets];
      }, [])
    );

    if (recipientSockets.length === 0) {
      debug(funcName, 'No recipient socket found on connected clients list, .userChanged event wont be emitted');
      return;
    }

    recipientSockets.forEach((recipientSocket) => {
      recipientSocket.emit(events.userChanged, user, function ack() {
        debug(funcName, '.userChanged has been received');
      });
      debug(funcName, '.userChanged event emitted');
    });
  }
};
