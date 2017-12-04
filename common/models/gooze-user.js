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
        photos: true,
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
};
