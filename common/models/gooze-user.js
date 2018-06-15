'use strict';

var debug = require('debug')('gooze:gooze-user');

/**
 *
 * @param GoozeUser{GoozeUser}
 */
module.exports = function(GoozeUser) {
  GoozeUser.constants = {
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

  GoozeUser.validatesInclusionOf('gender', {in: ['male', 'female', 'other'], allowNull: true});
  GoozeUser.validatesInclusionOf('status', {in: Object.keys(GoozeUser.constants.status)});
  GoozeUser.validatesInclusionOf('mode', {in: ['gooze', 'client']});

  var Rating = {
    value: 'number',
    count: 'number'
  };

  Object.keys(GoozeUser.constants.ratings).forEach(function (key) {
    GoozeUser.defineProperty(key, {type: Rating});
  });

  // TODO: add optional filter to show bad rate users
  GoozeUser.findByLocation = function(location, maxDistance, limit, options, cb) {
    var DateRequest = GoozeUser.app.models.DateRequest;
    var ObjectID = DateRequest.dataSource.ObjectID;

    debug(options);
    cb = typeof cb === 'function' ? cb : undefined;
    var where = {
      currentLocation: {
        near: location,
        maxDistance: maxDistance || 0,
        unit: 'kilometers'
      },
      activeUntil: {
        gte: new Date()
      }
    };
    var userId = options && options.accessToken && options.accessToken.userId;
    if (userId) {
      where.id = {
        neq: userId
      };
    }

    var promise = (
      Promise.all([
        GoozeUser.find({
          where: where,
          fields: [
            'id',
            'username',
            'email',
            'searchPic',
            'profilePic',
            'currentLocation',
            'imagesRating',
            'complianceRating',
            'dateQualityRating',
            'dateRating',
            'goozeRating'
          ],
          limit: limit || 5
        }),
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
      ]).then(function(result) {
        var users = result[0];
        var dateRequests = result[1];

        if (dateRequests && dateRequests.length > 0) {
          debug('findByLocation - found ' + dateRequests.length + ' unresponded requests.');

          var convertibleUsers = users.map(function(user) {
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
          });

          if (cb) {
            cb(null, convertibleUsers);
          }
          return convertibleUsers;
        } else {
          debug('findByLocation - no unresponded requests found.');
          if (cb) {
            cb(null, users);
          }
          return users;
        }
      })
        .catch(function(err) {
          if (cb) {
            cb(err);
          } else {
            throw err;
          }
        })
    );

    if (!cb) {
      return promise;
    }
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

  GoozeUser.addRate = function(userId, ratings, cb) {
    debug(userId, ratings);
    var GZERateComment = GoozeUser.app.models.GZERateComment;

    var promise;

    cb = typeof cb === 'function' ? cb : undefined;

    var parsedRatings = Object.keys(GoozeUser.constants.ratings).reduce(function(result, rateKey) {
      var rate = ratings[rateKey];

      if (rate > 0) {
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

    GoozeUser.app.models.GoozeAccessToken.destroyAll({
      expires: {
        lt: new Date()
      }
    }, function(err, tokens) {
      debug('err: ' + (err && err.message) + ', info: ' + JSON.stringify(tokens));
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
