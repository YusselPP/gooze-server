'use strict';

var debug = require('debug')('gooze:app-config');

/**
 *
 * @param AppConfig{AppConfig}
 */
module.exports = function(AppConfig) {
  /**
   * Gets app config
   * @param name
   * @param cb
   * @returns {Promise}
   */
  AppConfig.findByName = function(name, cb) {
    debug(name);
    cb = typeof cb === 'function' ? cb : undefined;
    return AppConfig.findOne({
      where: {
        name: name
      }
    }, cb);
  };

  AppConfig.remoteMethod('findByName', {
    accepts: [
      {arg: 'name', type: 'string', required: true}
    ],
    returns: {
      type: {
        name: 'string',
        config: 'object'
      },
      root: true
    }
  });

};
