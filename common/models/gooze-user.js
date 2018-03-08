'use strict';

/**
 *
 * @param Goozeuser{Validatable}
 */
module.exports = function(Goozeuser) {
  Goozeuser.validatesInclusionOf('gender', {in: ['male', 'female', 'other'], allowNull: true});
  Goozeuser.validatesInclusionOf('status', {in: ['available', 'unavailable']});
  Goozeuser.validatesInclusionOf('mode', {in: ['gooze', 'client']});

  Goozeuser.findByLocation = function(location, maxDistance, limit, options, cb) {
    console.log(options);
    Goozeuser.find({
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

  Goozeuser.remoteMethod('findByLocation', {
    http: { verb: 'get' },
    accepts: [
      { arg: 'location', type: 'GeoPoint', required: true, http: { source: 'query' } },
      { arg: 'maxDistance', type: 'number', http: { source: 'query' } },
      { arg: 'limit', type: 'number', http: { source: 'query' } },
      { arg: 'options', type: 'object', http: 'optionsFromRequest' }
    ],
    returns: { type: [], root: true }
  });

  Goozeuser.publicProfile = function(id, cb) {
    Goozeuser.findById(id, {
      fields: {
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

  Goozeuser.remoteMethod('publicProfile', {
    http: {
      path: '/:id/publicProfile',
      verb: 'get'
    },
    accepts: [
      { arg: 'id', type: 'string', required: true }
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

  var userLogin = Goozeuser.login;
  Goozeuser.login = function(credentials, include, fn) {
    userLogin.call(Goozeuser, credentials, include ? 'user' : undefined, function (err, token) {

      if (err) {
        if (err.code = 'LOGIN_FAILED') {

          credentials.username = credentials.email;
          delete credentials.email;

          userLogin.call(Goozeuser, credentials, include ? 'user' : undefined, fn);
          return;
        }

        fn(err);
        return;
      }

      fn(err, token);
    });
  };

  // email case insensitive
  Goozeuser.settings.caseSensitiveEmail = false;

  // username case insensitive
  Goozeuser.setter.username = function(value) {
    this.$username = value.toLowerCase();
  };

  Goozeuser.observe('access', function normalizeUsernameCase(ctx, next) {
    if (ctx.query.where && ctx.query.where.username && typeof(ctx.query.where.username) === 'string') {
      ctx.query.where.username = ctx.query.where.username.toLowerCase();
    }
    next();
  });
};
