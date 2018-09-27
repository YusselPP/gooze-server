var debug = require('debug')('gooze:user-transactions');

/**
 *
 * @param UserTransaction{UserTransaction}
 */
module.exports = function(UserTransaction) {
  UserTransaction.validatesPresenceOf('dateRequestId');
  UserTransaction.validatesPresenceOf('fromUserId');
  UserTransaction.validatesPresenceOf('toUserId');

  UserTransaction.paymentReport = function(cb) {
    const Payment = UserTransaction.app.models.Payment;

    cb = typeof cb === 'function' ? cb : undefined;

    const promise = (
      new Promise(function(resolve, reject) {
        UserTransaction.getDataSource().connector.connect(function(err, db) {
          if (err)
            return reject(err);

          const aggregatePipe = [{
            $lookup: {
              from: 'GoozeUser',
              let: {toUserId: '$toUserId'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$toUserId']
                    }
                  }
                }
              ],
              as: 'toUser'
            }
          },
          {
            $unwind: {
              path: '$toUser',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'Payment',
              let: {toUserId: '$toUserId'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$userId', '$$toUserId']
                    }
                  }
                }
              ],
              as: 'toUserPayment'
            }
          },
          {
            $unwind: {
              path: '$toUserPayment',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $addFields: {
              id: '$_id',
              toUserPaypalCustomerId: '$toUserPayment.paypalCustomerId'
            }
          },
          {
            $sort: {
              'toUser.username': 1,
              createdAt: 1
            }
          },
          {
            $skip: 0
          },
          {
            $limit: 10000
          }];

          db.collection('UserTransaction').aggregate(aggregatePipe, function(err, data) {
            if (err) {
              reject(err);
              return;
            }

            resolve(data);
          });
        });
      })
        .then(function(transactions) {
          const transWCustomer = (
            transactions
              .filter((trans) => typeof trans.toUserPaypalCustomerId === 'string')
          );

          return (
            Payment
              .findCustomers(transWCustomer.map((trans) => trans.toUserPaypalCustomerId))
              .then(function(customers) {
                return customers
                  .forEach(function(customer) {
                    if (customer) {
                      const foundIndex = transactions.findIndex((trans) => trans.toUserPaypalCustomerId === customer.id);

                      debug('paymentReport - foundIndex:', foundIndex);

                      if (foundIndex >= 0 && customer.paypalAccounts[0]) {
                        transactions[foundIndex].toUserPayment.paypalEmail = customer.paypalAccounts[0].email;
                        debug('paymentReport - found transaction:', transactions[foundIndex]);
                        debug('paymentReport - customer.paypalAccounts[0].email:', customer.paypalAccounts[0].email);
                      }
                    }
                  });
              })
              .then(() => transactions)
          );
        })
  );

    if (!cb) {
      return promise;
    }

    promise
      .then(function(response) {
        cb(null, response);
      })
      .catch(function(err) {
        cb(err);
      });
  };

  UserTransaction.remoteMethod('paymentReport', {
    http: {verb: 'get'},
    accepts: [
    ],
    returns: {type: [], root: true}
  });
};
