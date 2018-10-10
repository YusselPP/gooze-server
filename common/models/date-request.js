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

  DateRequest.findUnresponded = function(userId, options, cb) {
    var promise = new Promise(function(resolve, reject) {
      DateRequest.getDataSource().connector.connect(function(err, db) {
        var aggregatePipe;

        if (err)
          return reject(err);

        aggregatePipe = [
          {
            $match: {
              recipientId: DateRequest.dataSource.ObjectID(userId),
              recipientClosed: false,
              $or: [
                {status: 'sent'},
                {status: 'received'},
                {status: 'accepted'},
                {status: 'onDate'}
              ]
            }
          },
          {
            $lookup: {
              from: 'GoozeUser',
              as: 'sender',
              let: {senderId: '$senderId'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$senderId']
                    }
                  }
                },
                {
                  $project: {
                    'id': '$_id',
                    'username': 1,
                    'email': 1,
                    'searchPic': 1,
                    'profilePic': 1,
                    'imagesRating': 1,
                    'complianceRating': 1,
                    'dateQualityRating': 1,
                    'dateRating': 1,
                    'goozeRating': 1
                  }
                }
              ]
            }
          },
          {
            $unwind: {
              path: '$sender',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'GoozeUser',
              as: 'recipient',
              let: {recipientId: '$recipientId'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$recipientId']
                    }
                  }
                },
                {
                  $project: {
                    'id': '$_id',
                    'username': 1,
                    'email': 1,
                    'searchPic': 1,
                    'profilePic': 1,
                    'imagesRating': 1,
                    'complianceRating': 1,
                    'dateQualityRating': 1,
                    'dateRating': 1,
                    'goozeRating': 1
                  }
                }
              ]
            }
          },
          {
            $unwind: {
              path: '$recipient',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'Chat',
              localField: 'chatId',
              foreignField: '_id',
              as: 'chat'
            }
          },
          {
            $unwind: {
              path: '$chat',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'GZEDate',
              localField: 'dateId',
              foreignField: '_id',
              as: 'date'
            }
          },
          {
            $unwind: {
              path: '$date',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'DateRequest',
              let: {senderId: '$senderId'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$senderId', '$$senderId']
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'GZEDate',
                    localField: 'dateId',
                    foreignField: '_id',
                    as: 'date'
                  }
                },
                {
                  $unwind: {
                    path: '$date',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $match: {
                    $expr: {
                      $eq: ['$date.status', 'ended']
                    }
                  }
                }
              ],
              as: 'senderRequests'
            }
          },
          {
            $addFields: {
              id: '$_id',
              'senderOverallRating': {
                $sum: [
                  {$divide: ['$sender.complianceRating.value', '$sender.complianceRating.count']},
                  {$divide: ['$sender.dateQualityRating.value', '$sender.dateQualityRating.count']},
                  {$divide: ['$sender.dateRating.value', '$sender.dateRating.count']},
                  {$divide: ['$sender.goozeRating.value', '$sender.goozeRating.count']},
                  {$divide: ['$sender.imagesRating.value', '$sender.imagesRating.count']}
                ]
              },
              'senderSpent': {
                $reduce: {
                  input: '$senderRequests',
                  initialValue: 0,
                  in: {$sum: ['$$value', '$$this.amount']}
                }
              },
              senderRequests: null
            }
          },
          {
            $sort: {'senderOverallRating': -1, 'senderSpent': -1}
          },
          {
            $skip: 0
          },
          {
            $limit: 100
          }
        ];

        db.collection('DateRequest').aggregate(aggregatePipe, function(err, data) {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        });
      });
    });

    if (!cb) {
      return promise;
    }

    promise
      .then(function(dateRequests) {
        cb(null, dateRequests);
      })
      .catch(function(err) {
        cb(err);
      });
  };

  DateRequest.remoteMethod('findUnresponded', {
    http: {verb: 'get'},
    accepts: [
      {arg: 'userId', type: 'string', http: {source: 'query'}},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {type: [], root: true}
  });

  DateRequest.startDate = function(dateRequest, options, cb) {
    debug(dateRequest);
    var promise, notifiedUserId, starter;
    var userId = options && options.accessToken && options.accessToken.userId;
    var GZEDate = DateRequest.app.models.GZEDate;
    var GoozeUser = DateRequest.app.models.GoozeUser;
    var dateId = dateRequest.date && dateRequest.date.id;
    var senderId = dateRequest.sender && dateRequest.sender.id;
    var recipientId = dateRequest.recipient && dateRequest.recipient.id;

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
        .then(function() {
          return (
            Promise.all([
              DateRequest.findById(dateRequest.id),
              GoozeUser.findById(senderId),
              GoozeUser.findById(recipientId)
            ])
          );
        })
        .then(function([dateRequest, sender, recipient]) {
          var updatedUser, notifiedUser, result;
          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (starter === 'senderStarted') {
            updatedUser = sender;
            notifiedUser = recipient;
          } else if (starter === 'recipientStarted') {
            updatedUser = recipient;
            notifiedUser = sender;
          }

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, dateRequest, notifiedUser);
          } else {
            console.error('DateRequest.startDate - datesService not available yet');
          }

          result = {
            dateRequest: dateRequest,
            user: updatedUser
          };

          if (cb) {
            cb(null, result);
          } else {
            return result;
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
                GoozeUser.updateAll({id: senderId}, {status: GoozeUser.constants.status.available, activeDateRequestId: null}),
                GoozeUser.updateAll({id: recipientId}, {status: GoozeUser.constants.status.available, activeDateRequestId: null}),
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
          return (
            Promise.all([
              DateRequest.findById(dateRequest.id),
              GoozeUser.findById(senderId),
              GoozeUser.findById(recipientId)
            ])
          );
        })
        .then(function([updatedRequest, sender, recipient]) {
          debug(updatedRequest);
          var updatedUser, notifiedUser, result;
          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (ender === 'senderEnded') {
            updatedUser = sender;
            notifiedUser = recipient;
          } else if (ender === 'recipientEnded') {
            updatedUser = recipient;
            notifiedUser = sender;
          }

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, updatedRequest, notifiedUser);
          } else {
            console.error('DateRequest.endDate - datesService not available yet');
          }

          result = {
            dateRequest: updatedRequest,
            user: updatedUser
          };

          if (cb) {
            cb(null, result);
          } else {
            return result;
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
    returns: {type: 'object', root: true}
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
              GoozeUser.updateAll({id: senderId}, {status: GoozeUser.constants.status.available, activeDateRequestId: null}),
              GoozeUser.updateAll({id: recipientId}, {status: GoozeUser.constants.status.available, activeDateRequestId: null}),
              GZEDate.updateAll({id: dateId}, {status: GZEDate.constants.status.canceled})
            ])
          );
        })
        .then(function() {
          return (
            Promise.all([
              DateRequest.findById(dateRequest.id),
              GoozeUser.findById(senderId),
              GoozeUser.findById(recipientId)
            ])
          );
        })
        .then(function([updatedRequest, sender, recipient]) {
          debug(updatedRequest);
          var updatedUser, notifiedUser;
          var datesService = DateRequest.app.datesSocketChannel.customService;

          if (ender === 'senderCanceled') {
            updatedUser = sender;
            notifiedUser = recipient;
          } else if (ender === 'recipientCanceled') {
            updatedUser = recipient;
            notifiedUser = sender;
          }

          if (datesService) {
            datesService.emitDateStatusChanged(notifiedUserId, updatedRequest, notifiedUser);
          } else {
            console.error('DateRequest.cancelDate - datesService not available yet');
          }

          return {
            dateRequest: updatedRequest,
            user: updatedUser
          };
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
    returns: {type: 'object', root: true}
  });

  DateRequest.createCharge = function createCharge(data, cb) {
    var error;
    var funcName = 'createCharge';
    var GoozeUser = DateRequest.app.models.GoozeUser;
    var Payment = DateRequest.app.models.Payment;
    var datesService = DateRequest.app.datesSocketChannel.customService;

    var sale = {
      amount: data.amount,
      paymentMethodToken: data.paymentMethodToken,
      deviceData: data.deviceData, // PayPalService.deviceData,
      description: data.description, // "Recipient: \(dateRequest.recipient.username), DateRequest: \(dateRequest.id)",
      dateRequestId: data.dateRequestId, // data.dateRequest.id,
      fromUserId: data.fromUserId, // data.dateRequest.sender.id,
      toUserId: data.toUserId // data.dateRequest.recipient.id
    };

    debug(funcName, '-', data);

    // TODO: Validations before creating the charge?
    // Check that the user doesn't have an ongoing date already
    Promise.all([
      GoozeUser.findById(data.fromUserId),
      GoozeUser.findById(data.toUserId)
    ]).then(function([sender, recipient]) {
      debug(funcName, '-', 'Checking user status');

      if (sender && sender.status === GoozeUser.constants.status.onDate) {
        error = new Error('The sender is already on a date');
        error.statusCode = error.status = 409;
        error.code = 'INVALID_SENDER_STATUS';
        throw error;
      }

      if (recipient && recipient.status === GoozeUser.constants.status.onDate) {
        error = new Error('The recipient is already on a date');
        error.statusCode = error.status = 409;
        error.code = 'INVALID_RECIPIENT_STATUS';
        throw error;
      }

      sale.description = `Recipient: ${recipient.username}(${recipient.email}), Sender: ${sender.username}(${sender.email}), DateRequest: ${data.dateRequestId}`;
    })
      .then(() => Payment.createCharge(sale))
      .then(function() {
        let dateData = [
          data.dateRequestId,
          data.message,
          data.username,
          data.chat,
          data.mode
        ];
        let createDatePromise = new Promise(function(resolve, reject) {
          datesService.createCharge(dateData, function(err, dateRequest, sender) {
            if (err) {
              reject(err);
              return;
            }
            resolve({
              dateRequest,
              sender
            });
          });
        });

        return createDatePromise;
      })
      .then(function(response) {
        // TODO: send sendMessage('the user is not available anymore')
        return (
          DateRequest.find({
            where: {
              recipientId: data.toUserId,
              status: DateRequest.constants.status.accepted
            }
          })
            .then(function(dateRequests) {
              return dateRequests.map((dateRequest) => dateRequest.id);
            })
            .then(function(dateRequestIds) {
              debug(funcName, '- dateRequestIds:', dateRequestIds);

              return (
                DateRequest.updateAll(
                  {
                    id: {
                      inq: dateRequestIds
                    }
                  },
                  {
                    status: DateRequest.constants.status.rejected
                  }
                )
                  .then(function() {
                    return DateRequest.find({
                      where: {
                        id: {
                          inq: dateRequestIds
                        }
                      }
                    });
                  })
              );
            })
            .then(function(updatedRequests) {
              debug(funcName, '- updatedRequests:', updatedRequests);

              var datesService = DateRequest.app.datesSocketChannel.customService;

              if (datesService) {
                updatedRequests.forEach(function(updatedRequest) {
                  datesService.emitDateStatusChanged(updatedRequest.senderId, updatedRequest);
                  datesService.emitDateStatusChanged(updatedRequest.recipientId, updatedRequest);
                });
              } else {
                console.error(funcName + 'datesService not available yet');
              }

              const chatService = DateRequest.app.chatSocketChannel.customService;
              if (chatService) {
                updatedRequests.forEach(function(updatedRequest) {
                  const updatedRequestJson = updatedRequest.toJSON();
                  const username = updatedRequestJson.recipient.username;
                  const chatJson = updatedRequestJson.chat;
                  const mode = 'client';

                  const message = {
                    chatId: chatJson.id,
                    text: 'service.dates.becameUnavailable|' + username,
                    senderId: updatedRequestJson.recipientId,
                    type: 'info',
                    status: 'sent',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };

                  debug(funcName, '-', chatJson);

                  chatService.sendMessage([message, username, chatJson, updatedRequest, mode], function(err) {
                    if (err) {
                      console.error(funcName + ' - Failed to send createChargeSuccess message', err);
                      return;
                    }
                    debug(funcName + ' - "User not available" message sent successfully');
                  });
                });
              } else {
                console.error(funcName + 'chatService not available yet');
              }
            })
            .then(() => response)
        );
      })
      .then(function(response) {
        cb(null, response);
      })
      .catch(function(err) {
        cb(err);
      });
  };

  DateRequest.remoteMethod('createCharge', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'data',
        type: 'object',
        required: true,
        http: {source: 'body'}
      }
    ],
    returns: {type: 'object', root: true}
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
