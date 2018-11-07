var debug = require('debug')('gooze:payment');
var Conekta = require('../../server/payments/conekta/conekta-service');
var paymentProvider = require('../../server/payments/PaymentService')(Conekta);
var PayPalService = require('../../server/payments/paypal/paypal-service');
var braintree = require('braintree');

/**
 *
 * @param Payment{Payment}
 */
module.exports = function(Payment) {
  Payment.validatesPresenceOf('userId');
  /**
   * Paypal
   */
  Payment.createCustomer = function(customer, options, cb) {
    var userId = options && options.accessToken && options.accessToken.userId;
    var promise = (
      PayPalService.createCustomer(customer)
        .then(function(response) {
          if (response.success) {
            return Payment.create({
              userId: userId,
              paypalCustomerId: response.customer.id
            }).then(function(payment) {
              return {
                response: response,
                payment: payment
              };
            });
          }

          return {response: response};
        })
    );

    if (cb) {
      promise
        .then(function(responses) {
          cb(null, responses);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('createCustomer', {
    http: {verb: 'post', path: '/customer'},
    accepts: [
      {arg: 'customer', type: 'object', required: true, http: {source: 'body'}},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {root: true, type: 'object'}
  });

  Payment.findCustomer = function(id, cb) {
    var promise = PayPalService.findCustomer(id);

    if (cb) {
      promise
        .then(function(customer) {
          cb(null, customer);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('findCustomer', {
    http: {verb: 'get', path: '/customer/:id'},
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    returns: {root: true, type: 'object'}
  });

  Payment.findCustomers = function(ids, cb) {
    var promise;

    if (ids.length < 1) {
      promise = Promise.resolve([]);
    } else {
      promise = PayPalService.findCustomers(ids);
    }

    if (cb) {
      promise
        .then(function(customers) {
          cb(null, customers);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('findCustomers', {
    http: {verb: 'get', path: '/findCustomers'},
    accepts: [
      {arg: 'ids', type: 'array', required: true}
    ],
    returns: {root: true, type: 'array'}
  });

  Payment.findPaymentMethods = function(id, cb) {
    var promise = (
      PayPalService.findPaymentMethods(id)
        .then(function(paymentMethods) {
          return paymentMethods.map(function(paymentMethod) {
            if (paymentMethod instanceof braintree.PayPalAccount) {
              return {
                name: paymentMethod.email,
                token: paymentMethod.token,
                imageUrl: paymentMethod.imageUrl
              };
            }
          });
        })
    );

    if (cb) {
      promise
        .then(function(customer) {
          cb(null, customer);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('findPaymentMethods', {
    http: {verb: 'get', path: '/customer/:id/paymentMethod'},
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    returns: {root: true, type: 'array'}
  });

  Payment.createPaymentMethod = function(paymentMethod, cb) {
    var promise = (
      PayPalService.createPaymentMethod(paymentMethod)
        .then(function(response) {
          debug('createPaymentMethod -', response);
          return {response};
        })
    );

    if (cb) {
      promise
        .then(function(response) {
          cb(null, response);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('createPaymentMethod', {
    http: {verb: 'post', path: '/paymentMethod'},
    accepts: [
      {arg: 'paymentMethod', type: 'object', required: true, http: {source: 'body'}}
    ],
    returns: {root: true, type: 'object'}
  });

  Payment.deletePaymentMethod = function(token, cb) {
    var promise = PayPalService.deletePaymentMethod(token);

    if (cb) {
      promise
        .then(function() {
          cb(null);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('deletePaymentMethod', {
    http: {verb: 'delete', path: '/paymentMethod/:token'},
    accepts: [
      {arg: 'token', type: 'string', required: true}
    ],
    returns: {}
  });

  Payment.clientToken = function(cb) {
    var promise = PayPalService.generateClientToken();

    if (cb) {
      promise
        .then(function(clientToken) {
          cb(null, clientToken);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('clientToken', {
    http: {verb: 'get'},
    returns: {root: true, type: 'string'}
  });

  Payment.createCharge = function(sale, cb) {
    var UserTransaction = Payment.app.models.UserTransaction;
    debug('createCharge - request: ', sale);
    var promise = (
        PayPalService.createCharge(sale)
          .then(function(response) {
            var promise = Promise.resolve(response);

            debug('createCharge - response: ', response);

            if (response.success) {
              var transaction = response.transaction;

              var userTransaction = {
                fromUserId: sale.fromUserId,
                toUserId: sale.toUserId,
                dateRequestId: sale.dateRequestId,
                amount: transaction.amount,
                clientTaxAmount: sale.clientTaxAmount,
                goozeTaxAmount: sale.goozeTaxAmount,
                status: transaction.status,
                paymentMethod: 'paypal',
                gatewayTransactionId: transaction.id,

                processorResponseCode: transaction.processorResponseCode,
                processorResponseText: transaction.processorResponseText,

                currencyIsoCode: transaction.currencyIsoCode,
                /*
                  transactionFeeAmount
                  transactionFeeCurrencyIsoCode
                 */
                paypalAccount: transaction.paypalAccount
              };

              let feeAmount = 0;

              if (userTransaction.paypalAccount && userTransaction.paypalAccount.transactionFeeAmount > 0) {
                feeAmount = userTransaction.paypalAccount.transactionFeeAmount;
              }

              userTransaction.netAmount = userTransaction.amount - userTransaction.goozeTaxAmount - userTransaction.clientTaxAmount - feeAmount;

              promise = (
                UserTransaction.create(userTransaction)
                  .then(function() {
                    return response;
                  })
              );
            } else { // TODO: What happens with the response.errors, TEST
              throw new Error(response.message);
            }

            return promise;
          })
    );

    if (cb) {
      promise
        .then(function(response) {
          cb(null, response);
        })
        .catch(function(err) {
          cb(err);
        });
      return;
    }

    return promise;
  };

  Payment.remoteMethod('createCharge', {
    http: {verb: 'post'},
    accepts: [
      {arg: 'sale', type: 'object', required: true, http: {source: 'body'}}
    ],
    returns: {root: true, type: 'object'}
  });
};
