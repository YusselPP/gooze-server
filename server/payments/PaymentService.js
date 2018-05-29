'use strict';

var methods = [
  'createCustomer',
  'updateCustomer',

  'createPaymentSource',
  'updatePaymentSource',
  'deletePaymentSource',

  'createOrder',
  'updateOrder',
  'captureOrder',
  'refundOrder'
];

module.exports = createPaymentProvider;

function createPaymentProvider(provider) {
  validate(provider);

  return methods.reduce(function(result, methodName) {
    result[methodName] = provider[methodName];
    return result;
  }, {});
}

function validate(provider) {
  methods.forEach(function(methodName) {
    if (typeof provider[methodName] !== 'function') {
      throw new Error('createPaymentProvider - Required method: ' + methodName + ' is not implemented in the provider');
    }
  });
}
