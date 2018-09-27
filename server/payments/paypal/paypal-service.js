var debug = require('debug')('gooze:paypal-service');
var braintree = require('braintree');

// PayPal express checkout
var gateway = braintree.connect({
  accessToken: process.env.PP_ACCESS_TOKEN
});

// Braintree direct integration, ONLY SANDBOX AVAILABLE?
// var gateway = braintree.connect({
//   environment: braintree.Environment.Sandbox,
//   merchantId: process.env.BT_MERCHANT_ID,
//   publicKey: process.env.BT_PUBLIC_KEY,
//   privateKey: process.env.BT_PRIVATE_KEY
// });

var PayPalService = {
  generateClientToken: generateClientToken,
  createCharge: createCharge,
  createCustomer: createCustomer,
  findCustomer: findCustomer,
  findCustomers: findCustomers,
  findPaymentMethods: findPaymentMethods,
  createPaymentMethod: createPaymentMethod,
  deletePaymentMethod: deletePaymentMethod
};

module.exports = PayPalService;

/**
 * @returns {Promise<String>}
 */
function generateClientToken() {
  return (
    new Promise(function(resolve, reject) {
      gateway.clientToken.generate({}, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response.clientToken);
        }
      });
    })
  );
}

function createCharge(sale) {
  return (
    new Promise(function(resolve, reject) {
      gateway.transaction.sale({
        amount: sale.amount,
        paymentMethodNonce: sale.paymentMethodNonce,
        paymentMethodToken: sale.paymentMethodToken,
        deviceData: sale.deviceData,
        options: {
          submitForSettlement: true,
          paypal: {
            description: sale.description
          }
        }
      }, function(err, response) {
        debug(err, response);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    })
  );
}

/**
 * Create a customer with a payment method
 * @param {Object} customer.
 * @param {string} customer.paymentMethodNonce.
 * @returns {Promise<Customer>}
 */
function createCustomer(customer) {
  return (
    new Promise(function(resolve, reject) {
      gateway.customer.create({
        paymentMethodNonce: customer.paymentMethodNonce
      }, function(err, response) {
        debug(err, response);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    })
  );
}

/**
 * Find a customer by id
 * @param {String} id.
 * @returns {Promise<Customer>}
 */
function findCustomer(id) {
  return (
    new Promise(function(resolve, reject) {
      gateway.customer.find(id, function(err, response) {
        debug(err, response);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    })
  );
}

/**
 * Find customers by id
 * @param {Array} ids.
 * @returns {Promise<[Customer]>}
 */
function findCustomers(ids) {
  debug('findCustomers - ids', ids);
  return (
    new Promise(function(resolve, reject) {
      const customers = [];
      const customerStream = gateway.customer.search(function(search) {
        search.ids().in(ids);
      });

      customerStream.on('data', function(customer) {
        customers.push(customer);
      });

      customerStream.on('end', function() {
        resolve(customers);
      });

      customerStream.on('error', function(err) {
        reject(err);
      });
    })
  );
}

/**
 * Get customer's payment methods
 * @param {string} customerId
 * @returns {Promise<[PaymentMethod]>}
 */
function findPaymentMethods(customerId) {
  return (
    findCustomer(customerId)
      .then(function(customer) {
        return customer.paymentMethods;
      })
  );
}

/**
 * Create a paymentMethod for a customer
 * @param {Object} paymentMethod.
 * @param {string} paymentMethod.customerId
 * @param {string} paymentMethod.paymentMethodNonce
 * @returns {Promise<PaymentMethod>}
 */
function createPaymentMethod(paymentMethod) {
  return (
    new Promise(function(resolve, reject) {
      gateway.paymentMethod.create({
        customerId: paymentMethod.customerId,
        paymentMethodNonce: paymentMethod.paymentMethodNonce
      }, function(err, response) {
        debug(err, response);
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    })
  );
}

/**
 * Delete a paymentMethod by its token
 * @param {String} token.
 * @returns {Promise}
 */
function deletePaymentMethod(token) {
  return (
    new Promise(function(resolve, reject) {
      gateway.paymentMethod.delete(token, function(err) {
        debug(err);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  );
}
