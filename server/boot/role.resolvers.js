'use strict';

var debug = require('debug')('gooze:role-resolvers');

module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('requestOwners', function(role, ctx, cb) {
    var error;
    function reject(err) {
      process.nextTick(function() {
        cb(err, false);
      });
    }

    if (ctx.modelName !== 'DateRequest') {
      return reject(new Error('Invalid usage of requestOwners role resolver on ' + ctx.modelName + ' model.'));
    }

    var userId = ctx.accessToken.userId;
    if (!userId) {
      error = new Error('Authorization required.');
      error.statusCode = 401;
      return reject(error);
    }

    var requestId = ctx.remotingContext.req.params.id;
    debug('requestId: ' + requestId);
    if (!requestId) {
      error = new Error('Missing required parameter: id.');
      error.statusCode = 400;
      return reject(error);
    }

    app.models.DateRequest.count(
      {
        id: requestId,
        or: [
          {senderId: userId},
          {recipientId: userId}
        ]
      },
      function(err, count) {
        debug('Count: ' + count);
        if (err) {
          console.error(err);
          return cb(err, false);
        }

        return cb(null, count > 0);
      }
    );
  });
};
