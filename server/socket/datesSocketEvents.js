'use strict';

var debug = require('debug')('gooze:dates-socket-events');

var events = {
  dateRequestSent: 'dateRequestSent',
  dateRequestReceived: 'dateRequestReceived',
  dateRequestReceivedAck: 'dateRequestReceivedAck',
  dateRequestResponseSent: 'dateRequestResponseSent',
  dateRequestResponseReceived: 'dateRequestResponseReceived'
};

module.exports = function addDatesSocketEvents(socket, clients, app) {
  var DateRequest = app.models.DateRequest;
  var GoozeUser = app.models.GoozeUser;

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
          {status: 'sent'},
          {status: 'received'}
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
            DateRequest.create({
              senderId: senderId,
              recipientId: recipientId,
              status: 'sent'
            })
          ])
        );
      })
      .then(function(promisesResult) {
        var senderUser = promisesResult[0];
        var dateRequest = promisesResult[1];
        var recipientSocket;

        var request = {
          id: dateRequest.id,
          senderId: senderId,
          recipientId: recipientId,
          status: 'sent',
          senderUser: senderUser
        };
        debug('dateRequestSent - DateRequest persisted with [id=' + dateRequest.id + ']');

        debug('dateRequestSent - Emitting dateRequestReceived event to [id=' + recipientId + ']');
        recipientSocket = clients[recipientId];
        if (recipientSocket) {
          recipientSocket.emit(events.dateRequestReceived, request, function ack() {
            // Recipient has received the request
            debug('date request has been received');
            // Also add a hook to the method that query date request
            // in order to update the request state when the recipient user is not connected
            dateRequest.updateAttribute('status', 'received')
              .then(function() {
                debug('date request status updated: received');
              }).catch(function(err) {
                debug(err);
              });
          });
          debug('dateRequestSent - Successfully emitted: dateRequestReceived event');
        } else {
          debug('dateRequestSent - Recipient socket not found on connected clients list. DateRequest not emitted');
        }
        callback(null, true);
      })
      .catch(function(err) {
        debug(err);
        callback(err);
      });
  });
};
