'use strict';

var debug = require('debug')('gooze:dates-socket-events');

var events = {
  dateRequestSent: 'dateRequestSent',
  dateRequestReceived: 'dateRequestReceived',
  dateRequestResponseSent: 'dateRequestResponseSent',
  dateRequestResponseReceived: 'dateRequestResponseReceived'
};

module.exports = function addDatesSocketEvents(socket, clients, app) {
  socket.on(events.dateRequestSent, function(data) {
    debug('dateRequestSent - event received');
    var toUserId;
    var recipientSocket;
    var fromUserId = socket.userId;
    var toUser = data[0];

    if (toUser && (typeof toUser.id) === 'string' &&  toUser.id !== '') {
      toUserId = toUser.id;
    } else {
      debug('dateRequestSent - Invalid user id');
      return;
    }

    recipientSocket = clients[toUserId];
    if (!recipientSocket) {
      debug('dateRequestSent - Recipient socket not found on connected clients list.');
      return;
    }

    debug(
      'dateRequestSent - Sending request from user.id: ' +
      fromUserId + ', to user.id: ' + toUserId
    );

    app.models.GoozeUser.publicProfile(
      fromUserId,
      function(err, fromUser) {
        if (err) {
          debug('dateRequestSent - Error obtaining user public profile [id=' + fromUserId + ']');
          return;
        }

        debug('dateRequestSent - Emitting dateRequestReceived event to [id=' + toUserId + ']');
        recipientSocket.emit(events.dateRequestReceived, fromUser);
        debug('dateRequestSent - Successfully emitted: dateRequestReceived event');
      }
    );
  });

  // this events should only be received on the client side
  socket.on(events.dateRequestReceived, function(data) {
    debug('dateRequestReceived event received');
  });
};
