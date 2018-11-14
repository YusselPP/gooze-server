var debug = require('debug')('gooze:gooze-user');
var https = require('https');

/**
 *
 * @param GoozeUser{GoozeUser}
 */
module.exports = function(GoozeUser) {
  GoozeUser.constants = {
    gender: {
      male: 'male',
      female: 'female',
      other: 'other'
    },
    status: {
      available: 'available',
      unavailable: 'unavailable',
      onDate: 'onDate'
    },
    ratings: {
      imagesRating: 'imagesRating',
      complianceRating: 'complianceRating',
      dateQualityRating: 'dateQualityRating',
      dateRating: 'dateRating',
      goozeRating: 'goozeRating'
    },
    maxRateValue: 5
  };

  GoozeUser.validatesInclusionOf('gender', {in: Object.keys(GoozeUser.constants.gender), allowNull: true});
  GoozeUser.validate(
    'searchForGender',
    function customValidator(err) {
      if (!Array.isArray(this.searchForGender)) {
        err();
        return;
      }

      var genders = Object.keys(GoozeUser.constants.gender);
      var hasInvalidValues = this.searchForGender.some(function(value) {
        return genders.indexOf(value) === -1;
      });

      if (hasInvalidValues) {
        err();
      }
    },
    {message: 'Gender search must be a sub-array of: ' + Object.keys(GoozeUser.constants.gender).join(', ')}
  );

  GoozeUser.validatesInclusionOf('status', {in: Object.keys(GoozeUser.constants.status)});
  GoozeUser.validatesInclusionOf('mode', {in: ['gooze', 'client']});

  var Rating = {
    value: 'number',
    count: 'number'
  };

  Object.keys(GoozeUser.constants.ratings).forEach(function(key) {
    GoozeUser.defineProperty(key, {type: Rating});
  });

  function overallRating(user) {
    var rates = [
      user.imagesRating && user.imagesRating.value / user.imagesRating.count,
      user.complianceRating && user.complianceRating.value / user.complianceRating.count,
      user.dateQualityRating && user.dateQualityRating.value / user.dateQualityRating.count,
      user.dateRating && user.dateRating.value / user.dateRating.count,
      user.goozeRating && user.goozeRating.value / user.goozeRating.count
    ].filter(function(rate) { return typeof rate === 'number' && rate === rate; });

    if (rates.length <= 0) {
      return 0;
    }

    debug('user:', user);
    debug('rates:', rates);

    return rates.reduce(function(prev, rate) { return prev + rate; }, 0) / rates.length;
  }

  GoozeUser.hasCompleteProfile = function(id, cb) {
    let error;
    const funcName = 'hasCompleteProfile -';

    debug(funcName, 'id:', id);

    const promise = (
      GoozeUser.findById(id)
        .then(function(user) {
          if (!user) {
            debug(funcName, 'User not found');
            error = new Error('User with id[=' + id + '] not found');
            error.statusCode = error.status = 404;
            error.code = 'MODEL_NOT_FOUND';
            throw error;
          }

          const properties = [
            'birthday',
            'gender',
            'weight',
            'height',
            'languages',
            'interestedIn',
            'profilePic',
            'searchPic',
            'photos',
            'origin'
          ];

          const missingProperties = properties.reduce(function(result, prop) {
            const value = user[prop];

            if (!value || Array.isArray(value) && value.length === 0) {
              result.push(prop);
            }

            return result;
          }, []);

          if (missingProperties.length > 0) {
            debug(funcName, 'Missing properties:', missingProperties);
            error = new Error('validation.profile.incomplete');
            error.statusCode = error.status = 422;
            error.code = 'USER_INCOMPLETE_PROFILE';
            throw error;
          }

          return true;
        })
    );

    if (!cb) {
      return promise;
    }

    promise.then(function(hasCompleteProfile) {
      debug(funcName, 'hasCompleteProfile:', hasCompleteProfile);
      cb(null, hasCompleteProfile);
    }).catch(function(err) {
      cb(err);
    });
  };

  GoozeUser.remoteMethod('hasCompleteProfile', {
    http: {verb: 'get', path: '/hasCompleteProfile/:id'},
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    returns: {type: 'boolean'}
  });

  GoozeUser.isValidRegisterCode = function(code, cb) {
    let error;
    const funcName = 'isValidRegisterCode';
    const GZERegisterCode = GoozeUser.app.models.GZERegisterCode;

    debug(funcName, '- code:', code);

    const where = {
      code
    };

    const promise = (
      GZERegisterCode.findOne({
        where
      }).then(function(registerCode) {
        debug(funcName, ' - found registerCode: ', registerCode);

        const result = {isValid: false};

        if (!registerCode) {
          return result;
        }

        if (registerCode.count < 1) {
          debug(funcName, '- Code uses exceeded');
          error = new Error('vm.signUp.registerCodeUsesExceeded');
          error.statusCode = error.status = 422;
          error.code = 'CODE_USES_EXCEEDED';

          throw error;
        }

        result.isValid = true;

        return result;
      })
    );

    if (!cb) {
      return promise;
    }

    promise.then(function(isValid) {
      debug(funcName, ' - isValid:', isValid);
      cb(null, isValid);
    }).catch(function(err) {
      cb(err);
    });
  };

  GoozeUser.remoteMethod('isValidRegisterCode', {
    http: {verb: 'get', path: '/isValidRegisterCode/:code'},
    accepts: [
      {arg: 'code', type: 'string', required: true}
    ],
    returns: {root: true, type: 'object'}
  });

  GoozeUser.signUp = function(user, configName, cb) {
    let error;
    const funcName = 'signUp';
    const AppConfig = GoozeUser.app.models.AppConfig;

    debug(funcName, '- user:', user, 'config:', configName);

    const promise = (
      AppConfig.findByName(configName)
        .then(function(appConfig) {
          return !!(appConfig && appConfig.config && appConfig.config.isRegisterCodeRequired);
        })
        .then(function(isRegisterCodeRequired) {
          if (!isRegisterCodeRequired) {
            return true;
          }

          return (
            GoozeUser.isValidRegisterCode(user.registerCode)
              .then((result) => result.isValid)
          );
        })
        .then(function(isValidRegisterCode) {
          if (!isValidRegisterCode) {
            debug(funcName, '- Invalid register code');
            error = new Error('vm.signUp.invalidRegisterCode');
            error.statusCode = error.status = 422;
            error.code = 'INVALID_REGISTER_CODE';

            throw error;
          }

          return GoozeUser.count({username: user.username});
        })
        .then(function(result) {
          debug(funcName, '- count:', result);
          if (result > 0) {
            debug(funcName, '- Username already exists');
            error = new Error('validation.exists');
            error.statusCode = error.status = 422;
            error.code = 'ALREADY_EXISTS';
            error.args = 'user.username.fieldName';

            throw error;
          }

          return GoozeUser.count({email: user.email});
        })
        .then(function(result) {
          debug(funcName, '- count:', result);
          if (result > 0) {
            debug(funcName, '- Email already exists');
            error = new Error('validation.exists');
            error.statusCode = error.status = 422;
            error.code = 'ALREADY_EXISTS';
            error.args = 'user.email.fieldName';

            throw error;
          }

          return GoozeUser.create(user);
        })
        .then(function() {
          return (
            new Promise((resolve, reject) => {
              GoozeUser.login({email: user.email, password: user.password}, true, function(err, accessToken) {
                if (err) {
                  reject(err);
                  return;
                }

                resolve(accessToken);
              });
            })
          );
        })
        .then(function(accessToken) {
          // Discount register code
          const GZERegisterCode = GoozeUser.app.models.GZERegisterCode;

          return (
            GZERegisterCode
              .updateAll({code: user.registerCode}, {$inc: {count: -1}})
              .then(() => accessToken)
          );
        })
    );

    if (!cb) {
      return promise;
    }

    promise.then(function(response) {
      cb(null, response);
    }).catch(function(err) {
      cb(err);
    });
  };

  GoozeUser.remoteMethod('signUp', {
    http: {verb: 'post'},
    accepts: [
      {arg: 'user', type: 'object', required: true},
      {arg: 'configName', type: 'string', required: true}
    ],
    returns: {root: true, type: 'object'}
  });

  GoozeUser.activate = function(params, cb) {
    const funcName = 'activate -';

    debug(funcName, 'params:', params);

    const {
      id,
      currentLocation,
      activeUntil
    } = params;

    const promise = (
      GoozeUser.hasCompleteProfile(id)
        .then(() => (
          GoozeUser.updateById(id, {
            currentLocation,
            currentLoc: [currentLocation.lng, currentLocation.lat],
            activeUntil
          })
        ))
    );

    if (!cb) {
      return promise;
    }

    promise.then(function(response) {
      cb(null, response);
    }).catch(function(err) {
      cb(err);
    });
  };

  GoozeUser.remoteMethod('activate', {
    http: {verb: 'post'},
    accepts: [
      {arg: 'params', type: 'object', required: true}
    ],
    returns: {root: true, type: 'object'}
  });

  GoozeUser.updateById = function(id, data, cb) {
    var error, promise;

    cb = typeof cb === 'function' ? cb : undefined;

    promise = (
      GoozeUser.findById(id)
        .then(function(user) {
          if (!user) {
            debug('updateById - User not found');
            error = new Error('User with id[=' + id + '] not found');
            error.statusCode = error.status = 404;
            error.code = 'MODEL_NOT_FOUND';
            throw error;
          }

          return user.updateAttributes(data);
        })
    );

    if (!cb) {
      return promise;
    }

    promise
      .then(function(user) {
        cb(null, user);
      })
      .catch(function(err) {
        cb(err);
      });
  };

  // TODO: add optional filter to show bad rate users
  GoozeUser.findByLocation = function(location, maxDistance, limit, options, cb) {
    var DateRequest = GoozeUser.app.models.DateRequest;
    var ObjectID = DateRequest.dataSource.ObjectID;

    debug(options);
    cb = typeof cb === 'function' ? cb : undefined;
    maxDistance = (maxDistance || 0) * 1000;

    var where = {
      activeUntil: {
        $gte: new Date()
      }
    };
    var userId = options && options.accessToken && options.accessToken.userId;
    if (userId) {
      where._id = {
        $ne: userId
      };
    }

    var usersByLocation = function(where) {
      return new Promise(function(resolve, reject) {
        GoozeUser.getDataSource().connector.connect(function(err, db) {
          var aggregatePipe;

          if (err)
            return reject(err);

          aggregatePipe = [
            {
              $geoNear: {
                near: {type: 'Point', coordinates: [location.lng, location.lat]},
                distanceField: 'calcDistance',
                key: 'currentLoc',
                spherical: true,
                maxDistance: maxDistance
              }
            },
            {
              $match: where
            },
            {
              $lookup: {
                from: 'DateRequest',
                let: {userId: '$_id'},
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        // income as gooze
                        $eq: ['$recipientId', '$$userId']
                        // spent as client
                        // $eq: ['$recipientId', '$$userId']
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
                as: 'goozeRequest'
              }
            },
            {
              $project: {
                'username': 1,
                'email': 1,
                'searchPic': 1,
                'profilePic': 1,
                'currentLocation': 1,
                'imagesRating': 1,
                'complianceRating': 1,
                'dateQualityRating': 1,
                'dateRating': 1,
                'goozeRating': 1,
                id: '$_id',
                overallRating: {
                  $sum: [
                    {$divide: ['$complianceRating.value', '$complianceRating.count']},
                    {$divide: ['$dateQualityRating.value', '$dateQualityRating.count']},
                    {$divide: ['$dateRating.value', '$dateRating.count']},
                    {$divide: ['$goozeRating.value', '$goozeRating.count']},
                    {$divide: ['$imagesRating.value', '$imagesRating.count']}
                  ]
                },
                income: {
                  $reduce: {
                    input: '$goozeRequest',
                    initialValue: 0,
                    in: {$sum: ['$$value', '$$this.amount']}
                  }
                }
              }
            },
            {
              $sort: {overallRating: -1, income: -1}
            },
            {
              $skip: 0
            },
            {
              $limit: limit || 5
            }];

          db.collection('GoozeUser').aggregate(aggregatePipe, function(err, data) {
            if (err) {
              reject(err);
              return;
            }

            resolve(data);
          });
        });
      });
    };

    var promise = (
      GoozeUser.findById(userId)
        .then(function(user) {
          var searchForGender = user && user.searchForGender;

          if (searchForGender && searchForGender.length > 0) {
            where.gender = {
              $in: searchForGender
            };
          }

          return (
            Promise.all([
              usersByLocation(where),
              DateRequest.find({
                where: {
                  senderId: userId,
                  recipientClosed: false,
                  or: [
                    {status: DateRequest.constants.status.sent},
                    {status: DateRequest.constants.status.received},
                    {status: DateRequest.constants.status.accepted},
                    {status: DateRequest.constants.status.onDate}
                  ]
                }
              }),
              GoozeUser.updateAll(
                {
                  id: userId
                },
                {
                  dateLocation: location
                }
              )
            ])
          );
        }).then(function(result) {
          var users = result[0];
          var dateRequests = result[1];

          if (dateRequests && dateRequests.length > 0) {
            debug('findByLocation - found ' + dateRequests.length + ' unresponded requests.');

            var convertibleUsers = (
              users
                .map(function(user) {
                  var userDateReq;
                  var userId = user.id instanceof ObjectID ? user.id.toJSON() : user.id;

                  debug('userId: ' + userId);

                  dateRequests
                    .some(function(dateReq, index, array) {
                      var recipientId = dateReq.recipientId;

                      recipientId = (
                        (recipientId instanceof DateRequest.dataSource.ObjectID) ?
                          recipientId.toJSON() :
                          recipientId
                      );

                      var exists = recipientId === userId;

                      if (exists) {
                        debug('user: ' + user.id + ' converted to request: ' + dateReq.id);
                        userDateReq = dateReq;
                        array.splice(index, 1);
                      }

                      return exists;
                    });

                  if (userDateReq) {
                    return userDateReq;
                  } else {
                    return user;
                  }
                })
            );

            return convertibleUsers;
          } else {
            debug('findByLocation - no unresponded requests found.');
            return users;
          }
        })
      );

    if (!cb) {
      return promise;
    }

    promise
      .then(function(convertibleUsers) {
        cb(null, convertibleUsers);
      })
      .catch(function(err) {
        cb(err);
      });
  };

  GoozeUser.remoteMethod('findByLocation', {
    http: {verb: 'get'},
    accepts: [
      {
        arg: 'location',
        type: 'GeoPoint',
        required: true,
        http: {source: 'query'}
      },
      {arg: 'maxDistance', type: 'number', http: {source: 'query'}},
      {arg: 'limit', type: 'number', http: {source: 'query'}},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {type: [], root: true}
  });

  /**
   * Gets user public profile
   * @param id
   * @param cb
   * @returns {Promise}
   */
  GoozeUser.publicProfile = function(id, cb) {
    cb = typeof cb === 'function' ? cb : undefined;
    return GoozeUser.findById(id, {
      fields: {
        id: true,
        username: true,
        email: true,
        birthday: true,
        gender: true,
        weight: true,
        height: true,
        origin: true,
        phrase: true,
        languages: true,
        interestedIn: true,

        currentLocation: true,
        dateLocation: true,

        imagesRating: true,
        complianceRating: true,
        dateQualityRating: true,
        dateRating: true,
        goozeRating: true,

        searchPic: true,
        profilePic: true,
        photos: true,
        userComments: true
      },
      include: ['comments']
      // if cb is not a function it will return a promise
    }, cb);
  };

  GoozeUser.remoteMethod('publicProfile', {
    http: {
      path: '/:id/publicProfile',
      verb: 'get'
    },
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    returns: {
      type: {
        id: 'string',
        username: 'string',
        email: 'string',
        birthday: 'date',
        gender: 'string',
        weight: 'number',
        height: 'number',
        origin: 'string',
        phrase: 'string',
        languages: ['string'],
        interestedIn: ['string'],

        currentLocation: 'GeoPoint',
        dateLocation: 'GeoPoint',

        imagesRating: 'number',
        complianceRating: 'number',
        dateQualityRating: 'number',
        dateRating: 'number',
        goozeRating: 'number',

        searchPic: {
          'container': 'string',
          'url': 'string',
          'name': 'string',
          'blocked': 'boolean'
        },

        profilePic: {
          'container': 'string',
          'url': 'string',
          'name': 'string',
          'blocked': 'boolean'
        },
        photos: [{
          'container': 'string',
          'url': 'string',
          'name': 'string',
          'blocked': 'boolean'
        }]
      },
      root: true
    }
  });

  GoozeUser.sendLocationUpdate = function(location, cb) {
    debug(location);
    var datesService = GoozeUser.app.datesSocketChannel.customService;

    if (!datesService) {
      cb(null, false);
    }

    datesService.updateLocation([location.location.recipientId, location.location.user], function(error, updated) {
      debug(error, updated);
      cb(error, updated);
    });
  };

  GoozeUser.remoteMethod('sendLocationUpdate', {
    http: {verb: 'post'},
    accepts: [
      {
        arg: 'location',
        type: 'object',
        required: true,
        http: {source: 'body'}
      }
    ],
    returns: {arg: 'updated', type: 'boolean'}
  });

  GoozeUser.unreadMessagesCount = function(userId, mode, cb) {
    var Chat = GoozeUser.app.models.Chat;
    var ChatMessage = Chat.app.models.ChatMessage;
    var DateRequest = Chat.app.models.DateRequest;
    var ObjectID = ChatMessage.dataSource.ObjectID;

    debug('unreadMessagesCount - userId:', userId, ', mode:', mode);
    debug('unreadMessagesCount - typeof userId', typeof userId);

    var objectId = ObjectID(userId);

    var where = {
      or: [
        {status: DateRequest.constants.status.accepted},
        {status: DateRequest.constants.status.onDate}
      ]
    };

    if (mode === 'gooze') {
      where.recipientId = objectId;
      where.recipientClosed = false;
    } else {
      where.senderId = objectId;
      where.senderClosed = false;
    }

    var promise = (
      DateRequest.find({
        where: where,
        fields: ['chatId']
      }).then(function(dateRequests) {
        debug('unreadMessagesCount - dateRequests', dateRequests);
        return dateRequests.map(function(dateRequest) {
          return dateRequest.chatId;
        }).filter(function(chatId) {
          return chatId !== undefined || chatId !== null;
        });
      }).then(function(chatIds) {
        debug('unreadMessagesCount - chatIds', chatIds);
        if (chatIds.length <= 0) {
          return {};
        }

        return Promise.all(
          chatIds.map(function(chatId) {
            return (
              ChatMessage.count({
                chatId: chatId,
                senderId: {neq: userId},
                status: {neq: ChatMessage.constants.status.read}
              })
            );
          })
        ).then(function(counts) {
          debug('unreadMessagesCount - counts', counts);
          return (
            chatIds.reduce(function(result, chatId, index) {
              result[chatId] = counts[index];

              return result;
            }, {})
          );
        });
      })
    );

    if (!cb) {
      return promise;
    }

    promise.then(function(groupedCount) {
      debug('unreadMessagesCount - groupedCount', groupedCount);
      cb(null, groupedCount);
    }).catch(function(err) {
      cb(err);
    });
  };

  GoozeUser.remoteMethod('unreadMessagesCount', {
    http: {verb: 'get', path: '/:id/unreadMessagesCount'},
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {arg: 'mode', type: 'string', required: true, http: {source: 'query'}}
    ],
    returns: {root: true, type: 'object'}
  });

  GoozeUser.addRate = function(userId, ratings, cb) {
    debug(userId, ratings);
    var GZERateComment = GoozeUser.app.models.GZERateComment;

    var promise;

    cb = typeof cb === 'function' ? cb : undefined;

    var parsedRatings = Object.keys(GoozeUser.constants.ratings).reduce(function(result, rateKey) {
      var rate = ratings[rateKey];

      if (rate >= 0) {
        result[rateKey + '.value'] = Math.min(rate, GoozeUser.constants.maxRateValue);
        result[rateKey + '.count'] = 1;
      }

      return result;
    }, {});

    var commentId = ratings.comment && ratings.comment.id;

    debug('addRate - parsed ratings: ', parsedRatings);

    if (Object.keys(parsedRatings).length === 0) {
      if (cb) {
        cb(null, false);
        return;
      } else {
        return Promise.resolve();
      }
    }

    promise = (
      GoozeUser.findById(userId, {include: 'comments'})
        .then(function(user) {
          var error;

          if (!user) {
            debug('addRate - User not found');
            error = new Error('User not found');
            error.statusCode = error.status = 404;
            error.code = 'USER_NOT_FOUND';
            error.details = {
              userId: userId
            };
            throw error;
          }

          debug('found user: ', user);

          var updatePromises = [];

          updatePromises.push(
            user.updateAttributes(
              {
                $inc: parsedRatings
              }
            )
          );

          if (commentId) {
            updatePromises.push(
              new Promise(function(resolve, reject) {
                debug('addRate - Searching comment[id=' + commentId + ']');
                user.comments({where: {commentId: commentId}}, function(err, comments) {
                  if (err) {
                    debug('addRate - Comment\'s search error: ', err);
                    reject(err);
                    return;
                  }

                  debug(comments);

                  if (comments.length === 0) {
                    debug('addRate - Comment not found, creating entry');
                    GZERateComment.findById(commentId)
                      .then(function(comment) {
                        if (!comment) {
                          debug('addRate - commentId not found in GZERateComment, ignoring comment');
                          resolve(null);
                          return;
                        }
                        debug('addRate - Valid commentId, adding comment to user');
                        user.comments.create({count: 1, commentId: commentId}, function(err, comment) {
                          if (err) {
                            debug('addRate - Failed to create Comment, Error: ', err);
                            reject(err);
                            return;
                          }
                          debug('addRate - Comment successfully created');
                          resolve(comment);
                        });
                      })
                      .catch(function(reason) {
                        reject(reason);
                      });
                  } else {
                    debug('addRate - Comment found, updating count');
                    GoozeUser.updateAll({id: userId, 'userComments.commentId': commentId}, {
                      $inc: {'userComments.$.count': 1}
                    }, function(err, comment) {
                      if (err) {
                        debug('addRate - Failed to update Comment, Error: ', err);
                        reject(err);
                        return;
                      }
                      debug('addRate - Comment successfully updated', comment);
                      resolve(comment);
                    });
                  }
                });
              })
            );
          }

          return Promise.all(updatePromises);
        })
        .then(function() {
          if (cb) {
            cb(null, true);
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

  GoozeUser.remoteMethod('addRate', {
    http: {
      path: '/:id/addRate',
      verb: 'post'
    },
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {
        arg: 'ratings',
        type: 'object',
        required: true,
        http: {source: 'body'}
      }
    ],
    returns: {root: true, type: 'boolean'}
  });

  GoozeUser.sendEmail = function(mail, dateRequest, options, cb) {
    const GZEDate = GoozeUser.app.models.GZEDate;
    const DateRequest = GoozeUser.app.models.DateRequest;
    const UserTransaction = GoozeUser.app.models.UserTransaction;
    var error;
    var userId = options && options.accessToken && options.accessToken.userId;

    debug(mail, dateRequest);

    let promise = Promise.resolve();

    if (dateRequest && dateRequest.id) {
      promise = (
        DateRequest.findById(dateRequest.id)
          .then(function(dateRequest) {
            if (!dateRequest) {
              error = new Error('Model not found');
              error.statusCode = 404;
              error.code = 'NOT_FOUND';
              error.details = {
                model: 'DateRequest',
                id: dateRequest.id
              };
              throw error;
            }

            const dateRequestJson = dateRequest.toJSON();
            const {date} = dateRequestJson;

            if (date && date.status === GZEDate.constants.status.ended) {
              error = new Error('Ended dates can\'t be reviewed');
              error.statusCode = 422;
              error.code = 'REVIEW_TRANSACTION_DATE_ENDED_STATUS';
              error.details = {
                id: date.id,
                status: date.status
              };
              throw error;
            }

            return UserTransaction.findOne({
              where: {
                dateRequestId: dateRequest.id
              }
            });
          })
          .then(function(userTransaction) {
            if (!userTransaction) {
              error = new Error('Model not found');
              error.statusCode = 404;
              error.code = 'MODEL_NOT_FOUND';
              error.details = {
                model: 'UserTransaction'
              };
              throw error;
            }

            if (userTransaction.goozeStatus === UserTransaction.constants.status.paid) {
              error = new Error('Cannot review an already paid transaction');
              error.statusCode = 422;
              error.code = 'REVIEW_TRANSACTION_ALREADY_PAID';
              error.details = {
                id: userTransaction.id
              };
              throw error;
            }

            if (userTransaction.goozeStatus === UserTransaction.constants.status.review) {
              error = new Error('Transaction is already being review');
              error.statusCode = 422;
              error.code = 'REVIEW_TRANSACTION_ALREADY_REVIEW';
              error.details = {
                id: userTransaction.id
              };
              throw error;
            }

            return userTransaction.updateAttributes({
              goozeStatus: UserTransaction.constants.status.review
            });
          })
      );
    }

    promise.then(function() {
      return GoozeUser.findById(userId);
    })
      .then(function(user) {
        if (!user) {
          error = new Error('Model not found');
          error.statusCode = 404;
          error.code = 'MODEL_NOT_FOUND';
          error.details = {
            model: 'GoozeUser',
            id: userId
          };
          throw error;
        }

        GoozeUser.app.models.Email.send({
          to: process.env.GMAIL_USER,
          subject: `${user.username} - ${user.email}: ${mail.mail.subject} ${dateRequest ? `(${dateRequest.id})` : ''}`,
          text: mail.mail.text
        }, function(err) {
          if (!err) {
            console.log('email sent!');
          }
          cb(err);
        });
      })
      .catch(function(reason) {
        cb(reason);
      });
  };

  GoozeUser.remoteMethod('sendEmail', {
    http: {
      verb: 'post'
    },
    accepts: [
      {
        arg: 'mail',
        type: 'object',
        required: true,
        http: {source: 'body'}
      },
      {arg: 'dateRequest', type: 'object'},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ]
  });

  GoozeUser.facebookLogin = function(token, cb) {
    debug(JSON.stringify(token));

    https.get('https://graph.facebook.com/v3.0/me?fields=email&access_token=' + token, function(res) {
      var error;
      var data = [];

      debug('statusCode:', res.statusCode);
      debug('headers:', res.headers);

      if (!(res.statusCode >= 200 && res.statusCode < 300)) {
        error = new Error();
        error.statusCode = res.statusCode;
        error.message = res.statusMessage;
      }

      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        data.push(chunk);
      });

      res.on('end', function() {
        var response = data.join('');

        debug(response);

        try {
          response = JSON.parse(response);
        } catch (e) {
          error = e;
        }

        if (error) {
          error.details = response.error;
          cb(error);
        } else {
          GoozeUser.findOne({
            where: {
              facebookId: response.id
            }
          })
            .then(function(user) {
              if (!user) {
                return (
                  GoozeUser.findOne({
                    where: {
                      email: response.email
                    }
                  }).then(function(user) {
                    if (!user) {
                      error = new Error();
                      error.statusCode = 404;
                      error.message = 'No se encontró ninguna cuenta asociada con este facebook';
                      error.code = 'FB_LOGIN_MODEL_NOT_FOUND';
                      // error.details = response;
                      throw error;
                    }

                    return user.updateAttributes({facebookId: response.id});
                  })
                );
              }

              return user;
            })
            .then(function(user) {
              if (!user) {
                error = new Error();
                error.statusCode = 404;
                error.message = 'No se encontró ninguna cuenta asociada con este facebook';
                error.code = 'FB_LOGIN_MODEL_NOT_FOUND';
                // error.details = response;
                throw error;
              }

              user.createAccessToken(1209600, function(error, accessToken) {
                if (error) {
                  throw error;
                }

                var tokenJson = accessToken.toJSON();
                tokenJson.user = user.toJSON();

                cb(null, tokenJson);
              });
            })
            .catch(function(error) {
              console.error(error);
              cb(error);
            });
        }
      });
    });
  };

  GoozeUser.remoteMethod('facebookLogin', {
    http: {verb: 'post'},
    accepts: [
      {arg: 'token', type: 'string', required: true, http: {source: 'query'}}
    ],
    returns: {arg: 'accessToken', type: 'object', root: true}
  });

  var userLogin = GoozeUser.login;
  GoozeUser.login = function(credentials, include, fn) {
    userLogin.call(GoozeUser, credentials, include ? 'user' : undefined, function(err, token) {
      if (err) {
        if (err.code === 'LOGIN_FAILED') {
          credentials.username = credentials.email;
          delete credentials.email;

          userLogin.call(GoozeUser, credentials, include ? 'user' : undefined, fn);
          return;
        }

        fn(err);
        return;
      }

      fn(err, token);
    });
  };

  GoozeUser.afterRemote('login', function(context, token, next) {
    debug('after login hook called. Removing expired access tokens');
    var req = context && context.req;
    var accessToken = req && req.accessToken;
    var userId = accessToken ? accessToken.userId : undefined;

    GoozeUser.app.models.GoozeAccessToken.destroyAll({
      expires: {
        lt: new Date()
      }
    }, function(err, tokens) {
      debug('err: ' + (err && err.message) + ', info: ' + JSON.stringify(tokens));
    });

    next();
  });

  GoozeUser.afterRemote('logout', function(context, token, next) {
    var req = context && context.req;
    var accessToken = req && req.accessToken;
    var userId = accessToken ? accessToken.userId : undefined;

    debug('after logout hook called. Invalidating active until from user[=id' + userId + ']');

    if (!userId) {
      console.warn('after logout - logout called without userId');
      return;
    }

    GoozeUser.updateAll({id: userId}, {
      activeUntil: null
    }, function(err, user) {
      if (err) {
        console.error(err);
        return;
      }
      debug('after logout: user deactivated', user.activeUntil);
    });

    next();
  });

  // email case insensitive
  GoozeUser.settings.caseSensitiveEmail = false;

  // username case insensitive
  GoozeUser.setter.username = function(value) {
    this.$username = value.toUpperCase();
  };

  GoozeUser.observe('access', function normalizeUsernameCase(ctx, next) {
    debug('access hook called - normalizing username case: ' + JSON.stringify(ctx));
    var usernameParent = findObjectWithProperty(ctx.query.where, 'username');
    debug('username parent: ' + JSON.stringify(usernameParent));
    if (usernameParent && typeof(usernameParent.username) === 'string') {
      usernameParent.username = usernameParent.username.toUpperCase();
      debug('new username set: ' + usernameParent.username);
    }
    next();
  });
};

function findObjectWithProperty(object, key) {
  var value;
  Object.keys(object).some(function(k) {
    if (k === key) {
      value = object;
      return true;
    }
    if (object[k] && typeof object[k] === 'object') {
      value = findObjectWithProperty(object[k], key);
      return value !== undefined;
    }
  });
  return value;
}
