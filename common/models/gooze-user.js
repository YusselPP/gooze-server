'use strict';

/**
 *
 * @param Goozeuser{Validatable}
 */
module.exports = function(Goozeuser) {
  Goozeuser.validatesInclusionOf('gender', {in: ['male', 'female', 'other'], allowNull: true});
  Goozeuser.validatesInclusionOf('status', {in: ['available', 'unavailable']});
  Goozeuser.validatesInclusionOf('mode', {in: ['gooze', 'client']});

  Goozeuser.findByLocation = function(location, maxDistance, limit, cb) {
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
      { arg: 'limit', type: 'number', http: { source: 'query' } }
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
};
