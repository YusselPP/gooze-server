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
            $addFields: {
              id: '$_id'
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
            $limit: 100
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
