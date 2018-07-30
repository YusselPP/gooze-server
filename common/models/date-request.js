'use strict';

var debug = require('debug')('gooze:date-request');

/**
 *
 * @param DateRequest{DateRequest}
 */
module.exports = function(DateRequest) {
  DateRequest.constants = {
    status: {
      sent: 'sent',
      received: 'received',
      accepted: 'accepted',
      onDate: 'onDate',
      rejected: 'rejected',
      ended: 'ended'
    }
  };

  DateRequest.validatesInclusionOf('status', {in: Object.keys(DateRequest.constants.status)});
  DateRequest.validatesPresenceOf('senderId', 'recipientId');

  DateRequest.startDate = function(dateRequest, options, cb) {
    debug(dateRequest);
    var promise, notifiedUserId, starter;
    var userId = options && options.accessToken && options.accessToken.userId;
    var GZEDate = DateRequest.app.models.GZEDate;
    var dateId = dateRequest.date && dateRequest.date.id;

    cb = typeof cb === 'function' ? cb : undefined;
    userId = (userId instanceof DateRequest.dataSource.ObjectID) ? userId.toJSON() : userId;

    if (dateRequest.sender && dateRequest.sender.id === userId) {
      starter = 'senderStarted';
      notifiedUserId = dateRequest.recipient && dateRequest.recipient.id;
    } else if (dateRequest.recipient && dateRequest.recipient.id === userId) {
      starter = 'recipientStarted';
      notifiedUserId = dateRequest.sender && dateRequest.sender.id;
    } else {
      console.error('DateRequest.startDate - Couldn\'t determine notifiedUserId');
    }

    promise = (
      GZEDate.findById(dateId)
        .then(function(date) {
          if (!date) {
            debug('startDate - GZEDate not found');
            var error = new Error('GZEDate not found');
            error.statusCode = error.status = 404;
            error.code = 'GZEDate_NOT_FOUND';
            error.details = {
              dateId: dateId
            };
            throw error;
          }

          var newAttributes = {};
          newAttributes[starter] = true;

          return date.updateAttributes(newAttributes);
        })
        .then(function(date) {
          var newStatus;
          if (date.senderStarted && date.recipientStarted) {
            newStatus = {status: GZEDate.constants.status.progress};
          } else {
            newStatus = {status: GZEDate.constants.status.starting};
          }

          return date.updateAttributes(newStatus);
        })
        .then(function(date) {
          dateRequest.date = date;

          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, dateRequest);
          } else {
            console.error('DateRequest.startDate - datesService not available yet');
          }

          if (cb) {
            cb(null, dateRequest);
          } else {
            return dateRequest;
          }
        })
        .catch(function(reason) {
          if (cb) {
            cb(reason);
          } else {
            throw reason;
          }
        })
    );

    if (!cb) {
      return promise;
    }
  };

  DateRequest.remoteMethod('startDate', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'dateRequest',
        type: 'object',
        required: true,
        http: {source: 'body'}
      },
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {type: 'DateRequest', root: true}
  });

  DateRequest.endDate = function(dateRequest, options, cb) {
    debug(dateRequest);
    var promise, notifiedUserId, ender;
    var userId = options && options.accessToken && options.accessToken.userId;
    var GoozeUser = DateRequest.app.models.GoozeUser;
    var GZEDate = DateRequest.app.models.GZEDate;

    var dateId = dateRequest.date && dateRequest.date.id;
    var senderId = dateRequest.sender && dateRequest.sender.id;
    var recipientId = dateRequest.recipient && dateRequest.recipient.id;

    cb = typeof cb === 'function' ? cb : undefined;
    userId = (userId instanceof DateRequest.dataSource.ObjectID) ? userId.toJSON() : userId;

    if (dateRequest.sender && dateRequest.sender.id === userId) {
      ender = 'senderEnded';
      notifiedUserId = recipientId;
    } else if (dateRequest.recipient && dateRequest.recipient.id === userId) {
      ender = 'recipientEnded';
      notifiedUserId = senderId;
    } else {
      console.error('DateRequest.endDate - Couldn\'t determine notifiedUserId');
    }

    promise = (
      Promise.all([
        DateRequest.findById(dateRequest.id),
        GoozeUser.findById(senderId),
        GoozeUser.findById(recipientId),
        GZEDate.findById(dateId)
      ])
        .then(function(results) {
          if (results.some(function(model) { return !model; })) {
            debug('endDate - Model not found');
            var error = new Error('Model not found');
            error.statusCode = error.status = 404;
            error.code = 'MODEL_NOT_FOUND';
            error.details = {
              dateRequestId: dateRequest.id,
              senderId: senderId,
              recipientId: recipientId,
              dateId: dateId
            };
            throw error;
          }

          var date = results[3];
          var newAttributes = {};

          newAttributes[ender] = true;

          return date.updateAttributes(newAttributes);
        })
        .then(function(date) {
          if (date.senderEnded && date.recipientEnded) {
            return (
              Promise.all([
                DateRequest.updateAll({id: dateRequest.id}, {status: DateRequest.constants.status.ended}),
                GoozeUser.updateAll({id: senderId}, {status: GoozeUser.constants.status.available}),
                GoozeUser.updateAll({id: recipientId}, {status: GoozeUser.constants.status.available}),
                GZEDate.updateAll({id: dateId}, {status: GZEDate.constants.status.ended})
              ])
            );
          } else {
            return date.updateAttributes({
              status: GZEDate.constants.status.ending
            });
          }
        })
        .then(function() {
          return DateRequest.findById(dateRequest.id);
        })
        .then(function(updatedRequest) {
          debug(updatedRequest);

          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, updatedRequest);
          } else {
            console.error('DateRequest.endDate - datesService not available yet');
          }

          if (cb) {
            cb(null, updatedRequest);
          } else {
            return updatedRequest;
          }
        })
        .catch(function(reason) {
          if (cb) {
            cb(reason);
          } else {
            throw reason;
          }
        })
    );

    if (!cb) {
      return promise;
    }
  };

  DateRequest.remoteMethod('endDate', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'dateRequest',
        type: 'object',
        required: true,
        http: {source: 'body'}
      },
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {type: 'DateRequest', root: true}
  });

  DateRequest.cancelDate = function(dateRequest, options, cb) {
    debug(dateRequest);
    var promise, notifiedUserId, ender;
    var userId = options && options.accessToken && options.accessToken.userId;
    var GoozeUser = DateRequest.app.models.GoozeUser;
    var GZEDate = DateRequest.app.models.GZEDate;

    var dateId = dateRequest.date && dateRequest.date.id;
    var senderId = dateRequest.sender && dateRequest.sender.id;
    var recipientId = dateRequest.recipient && dateRequest.recipient.id;

    cb = typeof cb === 'function' ? cb : undefined;
    userId = (userId instanceof DateRequest.dataSource.ObjectID) ? userId.toJSON() : userId;

    if (dateRequest.sender && dateRequest.sender.id === userId) {
      ender = 'senderCanceled';
      notifiedUserId = recipientId;
    } else if (dateRequest.recipient && dateRequest.recipient.id === userId) {
      ender = 'recipientCanceled';
      notifiedUserId = senderId;
    } else {
      console.error('DateRequest.cancelDate - Couldn\'t determine notifiedUserId');
    }

    promise = (
      Promise.all([
        DateRequest.findById(dateRequest.id),
        GoozeUser.findById(senderId),
        GoozeUser.findById(recipientId),
        GZEDate.findById(dateId)
      ])
        .then(function(results) {
          if (results.some(function(model) { return !model; })) {
            debug('cancelDate - Model not found');
            var error = new Error('Model not found');
            error.statusCode = error.status = 404;
            error.code = 'MODEL_NOT_FOUND';
            error.details = {
              dateRequestId: dateRequest.id,
              senderId: senderId,
              recipientId: recipientId,
              dateId: dateId
            };
            throw error;
          }

          var date = results[3];
          var newAttributes = {};

          newAttributes[ender] = true;

          return date.updateAttributes(newAttributes);
        })
        .then(function() {
          return (
            Promise.all([
              DateRequest.updateAll({id: dateRequest.id}, {status: DateRequest.constants.status.ended}),
              GoozeUser.updateAll({id: senderId}, {status: GoozeUser.constants.status.available}),
              GoozeUser.updateAll({id: recipientId}, {status: GoozeUser.constants.status.available}),
              GZEDate.updateAll({id: dateId}, {status: GZEDate.constants.status.canceled})
            ])
          );
        })
        .then(function() {
          return DateRequest.findById(dateRequest.id);
        })
        .then(function(updatedRequest) {
          debug(updatedRequest);

          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, updatedRequest);
          } else {
            console.error('DateRequest.cancelDate - datesService not available yet');
          }

          return updatedRequest;
        })
    );

    if (!cb) {
      return promise;
    }

    promise
      .then(function(updatedRequest) {
        cb(null, updatedRequest);
      })
      .catch(function(reason) {
        cb(reason);
      });
  };

  DateRequest.remoteMethod('cancelDate', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'dateRequest',
        type: 'object',
        required: true,
        http: {source: 'body'}
      },
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {type: 'DateRequest', root: true}
  });

  DateRequest.closeChat = function(params, cb) {
    var funcName = 'closeChat - ';
    debug(funcName, params);
    var promise, error, notifiedUserId, closeProperty;
    var newAttributes = {};
    var mode = params.mode;
    var dateRequest = params.dateRequest;
    var dateRequestId = dateRequest && dateRequest.id;
    var senderId = dateRequest.sender && dateRequest.sender.id;
    var recipientId = dateRequest.recipient && dateRequest.recipient.id;

    cb = typeof cb === 'function' ? cb : undefined;

    if (mode === 'client') {
      closeProperty = 'senderClosed';
      notifiedUserId = recipientId;
    } else {
      closeProperty = 'recipientClosed';
      notifiedUserId = senderId;
    }

    promise = (
      DateRequest.findById(dateRequestId)
        .then(function(dateRequest) {
          if (!dateRequest) {
            debug(funcName, 'Model not found');
            error = new Error('Model not found');
            error.statusCode = error.status = 404;
            error.code = 'MODEL_NOT_FOUND';
            throw error;
          }

          if (dateRequest.status === DateRequest.constants.status.onDate) {
            debug(funcName, 'Cannot close the chat, there is an ongoing date');
            error = new Error('Cannot close the chat, there is an ongoing date');
            error.statusCode = error.status = 412;
            error.code = 'ONGOING_DATE';
            throw error;
          }

          if (
            dateRequest.status === DateRequest.constants.status.accepted ||
            dateRequest.status === DateRequest.constants.status.received ||
            dateRequest.status === DateRequest.constants.status.sent
          ) {
            newAttributes.status = DateRequest.constants.status.rejected;
          }

          newAttributes[closeProperty] = true;

          return dateRequest.updateAttributes(newAttributes);
        })
        .then(function(updatedRequest) {
          debug(funcName, updatedRequest);

          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (datesService && newAttributes.status) {
            datesService.emitDateStatusChanged(notifiedUserId, updatedRequest);
          } else {
            console.error(funcName + 'datesService not available yet');
          }

          return updatedRequest;
        })
    );

    if (!cb) {
      return promise;
    }

    promise
      .then(function(updatedRequest) {
        cb(null, updatedRequest);
      })
      .catch(function(reason) {
        cb(reason);
      });
  };

  DateRequest.remoteMethod('closeChat', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'params',
        type: 'object',
        required: true,
        http: {source: 'body'}
      }
    ],
    returns: {type: 'DateRequest', root: true}
  });
};
