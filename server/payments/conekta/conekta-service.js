'use strict';

var conekta = require('conekta');

conekta.api_key = process.env.CONEKTA_API_KEY;
conekta.api_version = '2.0.0';
conekta.locale = 'en';

var conektaPaymentService = {
  createCustomer: createCustomer,
  updateCustomer: updateCustomer,
  createPaymentSource: createPaymentSource,
  updatePaymentSource: updatePaymentSource,
  deletePaymentSource: deletePaymentSource,
  createOrder: createOrder,
  updateOrder: updateOrder,
  captureOrder: captureOrder,
  refundOrder: refundOrder
};

module.exports = conektaPaymentService;
/**
 * {
   *   name: 'Juan Perez',
   *   email: 'usuario@example.com',
   *   phone: '9999999999',
   *   antifraud_info:{
   *       account_created_at:1484040996,
   *       first_paid_at: 1485151007
   *   },
   *   payment_sources: [{
   *     token_id: 'tok_test_visa_4242',
   *     type: 'card'
   * }
 * @param customer
 * @returns {Promise<Customer>}
 */
function createCustomer(customer) {
  return (
    new Promise(function(resolve, reject) {
      conekta.Customer.create(customer, function(err, customer) {
        if (err) {
          reject(err);
        } else {
          resolve(customer);
        }
      });
    })
  );
}

function updateCustomer() {

}

function createPaymentSource() {

}

function updatePaymentSource() {

}

function deletePaymentSource() {

}

function createOrder() {

}

function updateOrder() {

}

function captureOrder() {

}

function refundOrder() {

}
