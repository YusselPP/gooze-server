'use strict';

var debug = require('debug')('gooze:gooze-access-token');

/**
 *
 * @param GoozeAccessToken{GoozeAccessToken}
 */
module.exports = function(GoozeAccessToken) {
  GoozeAccessToken.observe('before save', function(ctx, next) {
    debug('before save GoozeAccessToken hook called.');

    if (ctx.instance) {
      setExpireDate(ctx.instance, ctx.instance.created, ctx.instance.ttl);
    } else {
      setExpireDate(ctx.data, ctx.data.created, ctx.data.ttl);
    }

    next();

    function setExpireDate(model, created, ttl) {
      var expireDate;

      if (!(created instanceof Date) || isNaN(ttl)) {
        debug('expiration date not set. invalid arguments provided, created: ' + created + ', ttl: ' + ttl);
        return;
      }

      expireDate = new Date(created.getTime());
      expireDate.setSeconds(created.getSeconds() + ttl);

      debug('expiration date set to: ' + expireDate);

      model.expires = expireDate;
    }
  });
};
