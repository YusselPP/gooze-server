'use strict';

var debug = require('debug')('gooze:payment');
var Conekta = require('../../server/payments/conekta/conekta-service');
var paymentProvider = require('../../server/payments/PaymentService')(Conekta);

/**
 *
 * @param Payment{Payment}
 */
module.exports = function(Payment) {
  Payment.createCustomer = function(customer, options, cb) {
    var promise = paymentProvider.createCustomer(customer);

    if (cb) {
      promise
        .then(function(customer) {
          cb(null, true);
        })
        .catch(function(err) {
          cb(err, false);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('createCustomer', {
    http: {verb: 'post'},
    accepts: [
      {arg: 'customer', type: 'object', required: true, http: {source: 'body'}},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {root: true, type: 'boolean'}
  });
};
