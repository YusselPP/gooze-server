var debug = require('debug')('gooze:user-transactions');

/**
 *
 * @param UserTransaction{UserTransaction}
 */
module.exports = function(UserTransaction) {
  UserTransaction.constants = {
    status: {
      pending: 'pending',
      paid: 'paid',
      review: 'review',
    }
  };

  UserTransaction.utils = {
    isValidStatus(aStatus) {
      return (
        Object.keys(UserTransaction.constants.status)
          .some(status => status === aStatus)
      );
    }
  };

  UserTransaction.validatesPresenceOf('dateRequestId');
  UserTransaction.validatesPresenceOf('fromUserId');
  UserTransaction.validatesPresenceOf('toUserId');

  UserTransaction.paymentReport = function(filter, cb) {
    debug('paymentReport - filter:', filter);
    const Payment = UserTransaction.app.models.Payment;
    const {
      fromDate,
      toDate,
      status
    } = filter;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const matcher = {};

    cb = typeof cb === 'function' ? cb : undefined;

    if (isValidDate(from)) {
      if (matcher.createdAt) {
        matcher.createdAt.$gte = from;
      } else {
        matcher.createdAt = {
          $gte: from
        };
      }
    }

    if (isValidDate(to)) {
      to.setDate(to.getDate() + 1);

      if (matcher.createdAt) {
        matcher.createdAt.$lt = to;
      } else {
        matcher.createdAt = {
          $lt: to
        };
      }
    }

    if (status) {
      matcher.goozeStatus = status;
    }

    let promise;

    if (status && (typeof status !== 'string' || !UserTransaction.utils.isValidStatus(status))) {
      promise = Promise.resolve([]);
    } else {
      promise = (
        new Promise(function(resolve, reject) {
          UserTransaction.getDataSource().connector.connect(function(err, db) {
            if (err)
              return reject(err);

            const aggregatePipe = [
              {
                $match: matcher
              },
              {
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
                      if (customer && customer.paypalAccounts[0]) {
                        transactions.forEach((trans, index) => {
                          if (trans.toUserPaypalCustomerId === customer.id) {
                            transactions[index].toUserPayment.paypalEmail = customer.paypalAccounts[0].email;
                            debug('paymentReport - found transaction:', transactions[index]);
                            debug('paymentReport - customer.paypalAccounts[0].email:', customer.paypalAccounts[0].email);
                          }
                        });
                        // const foundIndex = transactions.findIndex((trans) => trans.toUserPaypalCustomerId === customer.id);
                        //
                        // debug('paymentReport - foundIndex:', foundIndex);
                        //
                        // if (foundIndex >= 0 && customer.paypalAccounts[0]) {
                        //   transactions[foundIndex].toUserPayment.paypalEmail = customer.paypalAccounts[0].email;
                        //   debug('paymentReport - found transaction:', transactions[foundIndex]);
                        //   debug('paymentReport - customer.paypalAccounts[0].email:', customer.paypalAccounts[0].email);
                        // }
                      }
                    });
                })
                .then(() => transactions)
            );
          })
      );
    }

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
      {arg: 'filter', type: 'object'}
    ],
    returns: {type: [], root: true}
  });
};

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}
