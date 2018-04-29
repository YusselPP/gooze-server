'use strict';

var debug = require('debug')('gooze:socket-service');
var Server = require('socket.io');
var socketIOAuth = require('socketio-auth');

var datesSocketEvents = require('./datesSocketEvents');
var chatSocketEvents = require('./chatSocketEvents');

var SocketService = {
  createSocketChannels: createSocketChannels
};

module.exports = SocketService;

var namespaces = {
  chat: '/chat',
  dates: '/dates'
};

function createSocketChannels(webServer, app) {
  var io = new Server(webServer, {
    path: process.env.SOCKET_PATH
  });

  debug('server path: ' + io.path());

  app.chatSocketChannel = createChannel(io, namespaces.chat, chatSocketEvents);
  app.datesSocketChannel = createChannel(io, namespaces.dates, datesSocketEvents);

  function createChannel(io, namespace, socketEvents) {
    var channel = io.of(namespace);
    // TODO: Add support for clients logged in multiple devices at same time.
    var clients = {};
    var authConfig = {
      authenticate: handleAuthentication,
      postAuthenticate: handlePostAuthentication,
      timeout: 3000
    };

    channel.on('connection', function(socket) {
      channelDebug('Socket connected [id=' + socket.id + ']');

      socket.on('disconnect', function() {
        channelDebug('Socket disconnected [id=' + socket.id + ']');
      });
    });

    socketIOAuth(channel, authConfig);

    return channel;

    function handleAuthentication(socket, data, callback) {
      var error;
      var GoozeAccessTokenModel = app.models.GoozeAccessToken;
      var credentials = data[0]; // get credentials sent by the client

      if (!isValidCredentials(credentials)) {
        error = new Error('Invalid credentials.');
        error.statusCode = error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        channelDebug(error.message);
        callback(error);
        return;
      }

      credentials = sanitizeCredentials(credentials);

      channelDebug('Authenticating with credentials: ' + JSON.stringify(credentials));

      GoozeAccessTokenModel.find({
        where: {
          userId: credentials.userId,
          id: credentials.id
        }
      }, function(err, tokenDetails) {
        if (err) {
          channelDebug('Error querying GoozeAccessToken');
          callback(err);
          return;
        }

        if (tokenDetails.length > 0) {
          var tokenDetail = tokenDetails[0];

          if (tokenDetails.length > 1) {
            channelDebug('WARNING: Found more than one access token with the provided credentials');
          }

          channelDebug('User authenticated. user.id: ' + tokenDetail.userId);

          socket.userId = tokenDetail.userId;

          if (Array.isArray(clients[credentials.userId])) {
            clients[credentials.userId].push(socket);
          } else {
            clients[credentials.userId] = [socket];
          }
          channelDebug('Clients connected: ' + countClients(clients));

          socket.on('disconnect', function() {
            channelDebug('User disconnected');

            if (Array.isArray(clients[credentials.userId])) {
              var index = clients[credentials.userId].indexOf(socket);
              clients[credentials.userId].splice(index, 1);
            }
            channelDebug('Clients connected: ' + countClients(clients));
          });

          callback(null, true);
        } else {
          channelDebug('GoozeAccessToken not found with provided credentials.');
          callback(null, false);
        }
      });
    }

    function handlePostAuthentication(socket) {
      channelDebug('Attaching channel events');
      socketEvents(socket, clients, app, channel);
    }

    function channelDebug(message) {
      debug('Channel: ' + namespace + '. ' + message);
    }
  }
}

function isValidCredentials(credentials) {
  return (
    credentials &&
    (typeof credentials.id === 'string') && credentials.id !== '' &&
    (typeof credentials.userId === 'string') && credentials.userId !== ''
  );
}

function sanitizeCredentials(credentials) {
  return {
    id: credentials.id,
    userId: credentials.userId
  };
}

function countClients(clients) {
  return (
    Object.keys(clients)
      .reduce(function(result, clientKey) {
        var client = clients[clientKey];

        if (Array.isArray(client)) {
          return result + client.length;
        } else {
          return result;
        }
      }, 0)
  );
}
