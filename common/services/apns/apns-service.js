/**
 * Created by yparedes on 6/17/18.
 */
'use strict';

var debug = require('debug')('gooze:apns-service');
var apn = require('apn');

var MAX_ALERT_LENGTH = 100;

module.exports = {
  connect: connect,
  send: send,
  disconnect: disconnect
};

function connect() {
  var options = {
    token: {
      key: process.env.APN_KEY_PATH,
      keyId: process.env.APN_KEY_ID,
      teamId: process.env.APN_TEAM_ID
    }
    // production: defaults to NODE_ENV == "production"
  };

  return new apn.Provider(options);
}

function send(provider, userId, notification) {
  var note = new apn.Notification();
  var alert = notification.alert;

  note.alert = alert;
  note.badge = notification.badge;
  note.payload = notification.payload;
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.sound = 'default';
  note.topic = process.env.APN_APP_ID;

  getDeviceTokens(userId)
    .then(function(tokens) {
      return provider.send(note, tokens).then(function(result) {
        debug('failed tokens: ', result.failed);
        debug('removing inactive(HTTP error 410) tokens from db');
        var devicesToRemove = result.failed.reduce(function(result, failed) {
          if (failed.error.statusCode === 410) {
            result.push(failed.device);
          }
          return result;
        }, []);

        if (devicesToRemove.length > 0) {
          removeInactiveDeviceTokens(devicesToRemove);
        }
      });
    })
    .catch(function(reason) {
      console.error(reason);
    });
}

function disconnect(provider) {
  provider.shutdown();
}

/** Helper methods **/
function getDeviceTokens(userId) {
  var app = require('../../../server/server');
  var DeviceToken = app.models.DeviceToken;

  return (
    DeviceToken.find({
      where: {
        userId: userId
      },
      fields: ['token']
    })
      .then(function(deviceTokens) {
        return deviceTokens.map(function(deviceToken) {
          return deviceToken.token;
        });
      })
  );
}

function removeInactiveDeviceTokens(deviceTokens) {
  var app = require('../../../server/server');
  var DeviceToken = app.models.DeviceToken;

  return (
    DeviceToken.destroyAll({
      or: deviceTokens.map(function(token) { return {token: token}; })
    })
      .then(function(err, info) {
        if (err) {
          console.error(err);
          return;
        }
        debug(info);
      })
      .catch(function(reason) {
        console.error(reason);
      })
  );
}
