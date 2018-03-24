'use strict';

var debug = require('debug')('gooze:gooze-user');

/**
 *
 * @param GoozeUser{GoozeUser}
 */
module.exports = function(GoozeUser) {
  GoozeUser.validatesInclusionOf('gender', {in: ['male', 'female', 'other'], allowNull: true});
  GoozeUser.validatesInclusionOf('status', {in: ['available', 'unavailable']});
  GoozeUser.validatesInclusionOf('mode', {in: ['gooze', 'client']});

  GoozeUser.findByLocation = function(location, maxDistance, limit, options, cb) {
    debug(options);
    GoozeUser.find({
      where: {
        currentLocation: {
          near: location,
          maxDistance: maxDistance || 0,
          unit: 'kilometers'
        },
        activeUntil: {
          gte: new Date()
        }
      },
      fields: {
        id: true,
        username: true,
        searchPic: true,
        currentLocation: true
      },
      limit: limit || 5
    }, function(err, users) {
      cb(err, users);
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

  GoozeUser.publicProfile = function(id, cb) {
    GoozeUser.findById(id, {
      fields: {
        id: true,
        username: true,
        birthday: true,
        gender: true,
        weight: true,
        height: true,
        origin: true,
        phrase: true,
        languages: true,
        interestedIn: true,

        imagesRating: true,
        complianceRating: true,
        dateQualityRating: true,
        dateRating: true,
        goozeRating: true,

        profilePic: true,
        photos: true
      }
    }, function(err, user) {
      cb(err, user);
    });
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
        username: 'string',
        birthday: 'date',
        gender: 'string',
        weight: 'number',
        height: 'number',
        origin: 'string',
        phrase: 'string',
        languages: ['string'],
        interestedIn: ['string'],

        imagesRating: 'number',
        complianceRating: 'number',
        dateQualityRating: 'number',
        dateRating: 'number',
        goozeRating: 'number',

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
    this.$username = value.toLowerCase();
  };

  GoozeUser.observe('access', function normalizeUsernameCase(ctx, next) {
    if (ctx.query.where && ctx.query.where.username && typeof(ctx.query.where.username) === 'string') {
      ctx.query.where.username = ctx.query.where.username.toLowerCase();
    }
    next();
  });
};
