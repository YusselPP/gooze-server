import moment from "moment-timezone";

import {Observable} from "rxjs/Observable";
import {combineEpics} from "redux-observable";

import appConfig from "app/app.config";
import {createLogger} from "app/services/log/log.service";
import {errorMessage, assert} from "utils";
import {toastError} from "../../../ui/utils/ToastAlerts.service";

import {
  ACTION_TYPES,
  payStatus,
  fetchPayments,
  fetchPaymentsSuccess,
  fetchPaymentsFailure,
  paySuccess,
  payFailure,
  setPaymentPendingSuccess,
  setPaymentPendingFailure
} from "./report.actions";

const log = createLogger("state/payment/report/report.epic");

const {

	FETCH_PAYMENTS,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE,
  SET_FILTER_STATUS,
  PAY,
  PAY_SUCCESS,
  SET_PAYMENT_PENDING,
  SET_PAYMENT_PENDING_SUCCESS

} = ACTION_TYPES;

export default combineEpics(
	performPaymentsFetch,
  searchOnParametersChange,
  pay,
  setPaymentPending,
  fetchPaymentsOnPaySuccess
);

function performPaymentsFetch(action$, store) {
	return (
		action$
			.ofType(FETCH_PAYMENTS)
			.switchMap(function ({fromDate, toDate, status}) {
				try {
          const {auth} = store.getState();
          let fromParameter, toParameter;
          const from = moment(fromDate);
          const to = moment(toDate);

          if (fromDate && from.isValid()) {
            fromParameter = from.utc().format();
          }

          if (toDate && to.isValid()) {
            toParameter = to.utc().format();
          }

          const filterJsonString = encodeURIComponent(
            JSON.stringify({
              fromDate: fromParameter,
              toDate: toParameter,
              status
            })
          );


          return (
              Observable
                  .ajax({
                      url: `${appConfig.apiPath}/UserTransactions/paymentReport?filter=${filterJsonString}`,
                      responseType: "json",
                      headers: {
                        "Authorization": auth.token,
                        "Content-Type": "application/json"
                      }
                  })
                  .map(({response}) => (
                      response.map(function (payment) {
                          const {
                            id,
                            goozeStatus,
                            createdAt,
                            amount,
                            netAmount,
                            clientTaxAmount,
                            goozeTaxAmount,
                            toUser,
                            toUserPayment,
                            paidAmount
                          } = payment;

                          const grossAmount = (+amount) || 0;

                          return {
                              id,
                              createdAt,
                              goozeStatus,
                              username: toUser && toUser.username,
                              paypalEmail: toUserPayment && toUserPayment.paypalEmail,
                              grossAmount,
                              netAmount: (+netAmount) || 0,
                              clientTaxAmount: (+clientTaxAmount) || 0,
                              goozeTaxAmount: (+goozeTaxAmount) || 0,

                              isSelected: false,
                              paidAmount: (+paidAmount) || (+netAmount) || 0
                          }
                      })
                  ))
                  .map((payments) => (
                    payments.reduce(function (result, payment) {
                      const userPayments = result[payment.username];

                      if (userPayments === undefined) {

                        result[payment.username] = {
                          payments: [payment],
                          grossAmount: payment.grossAmount,
                          netAmount: payment.netAmount,
                          paidAmount: payment.paidAmount
                        };

                      } else {

                        userPayments.payments.push(payment);
                        userPayments.grossAmount += payment.grossAmount;
                        userPayments.netAmount += payment.netAmount;
                        userPayments.paidAmount += payment.paidAmount;
                      }

                      return result;
                    }, {})
                  ))
                  .map((payments) => fetchPaymentsSuccess({payments}))
                  .catch(function (err) {

                      const {response} = err;
                      const error = assert.object(response) ? response.error : error;

                      const msg = `Can't access payments report: ${errorMessage(error)}`;

                      log.error(msg, error);
                      toastError(msg);

                      return Observable.of(fetchPaymentsFailure({error}));
                  })

          );

				} catch (error) {
            return Observable.of(
                fetchPaymentsFailure({error})
            );
				}

			})
	);
}

function pay(action$, store) {
  return (
    action$
      .ofType(PAY)
      .switchMap(function () {

        try {
          const {payment, auth} = store.getState();
          const {report} = payment;
          const {results} = report;
          const {payments} = results;

          const paymentsArray = (
            Object.keys(payments)
              .map((key) => (
                payments[key]
              ))
              .reduce((result, paymentGroup) => [...result, ...paymentGroup.payments], [])
          );

          const selectedPayments = paymentsArray.filter((payment) => payment.isSelected && payment.goozeStatus !== payStatus.paid);

          if (selectedPayments.length === 0) {
            return Observable.of(paySuccess());
          }

          return (
            Observable
              .ajax({
                url: `${appConfig.apiPath}/UserTransactions/pay`,
                method: "POST",
                responseType: "json",
                headers: {
                  "Authorization": auth.token,
                  "Content-Type": "application/json"
                },
                body: {
                  payments: selectedPayments.map((payment) => {
                    const {id, paidAmount} = payment;
                    return {id, paidAmount};
                  })
                }
              })
              .mapTo(paySuccess())
              .catch(function (err) {

                const {response} = err;
                const error = assert.object(response) ? response.error : error;

                const msg = errorMessage(error);

                log.error(msg, error);
                toastError(msg);

                return Observable.of(payFailure({error}));
              })

          );

        } catch (error) {

          const msg = errorMessage(error);
          log.error(msg, error);
          toastError(msg);

          return Observable.of(
            payFailure({error})
          );
        }

      })
  );
}

function setPaymentPending(action$, store) {
  return (
    action$
      .ofType(SET_PAYMENT_PENDING)
      .switchMap(function () {

        try {
          const {payment, auth} = store.getState();
          const {report} = payment;
          const {results} = report;
          const {payments} = results;

          const paymentsArray = (
            Object.keys(payments)
              .map((key) => (
                payments[key]
              ))
              .reduce((result, paymentGroup) => [...result, ...paymentGroup.payments], [])
          );

          const selectedPayments = paymentsArray.filter((payment) => payment.isSelected && payment.goozeStatus !== payStatus.pending);

          if (selectedPayments.length === 0) {
            return Observable.of(setPaymentPendingSuccess());
          }

          return (
            Observable
              .ajax({
                url: `${appConfig.apiPath}/UserTransactions/updateMany`,
                method: "POST",
                responseType: "json",
                headers: {
                  "Authorization": auth.token,
                  "Content-Type": "application/json"
                },
                body: {
                  transactions: selectedPayments.map((payment) => {
                    const {id} = payment;
                    return {id, goozeStatus: payStatus.pending};
                  })
                }
              })
              .mapTo(setPaymentPendingSuccess())
              .catch(function (err) {

                const {response} = err;
                const error = assert.object(response) ? response.error : error;

                const msg = errorMessage(error);

                log.error(msg, error);
                toastError(msg);

                return Observable.of(setPaymentPendingFailure({error}));
              })

          );

        } catch (error) {

          const msg = errorMessage(error);
          log.error(msg, error);
          toastError(msg);

          return Observable.of(
            setPaymentPendingFailure({error})
          );
        }

      })
  );
}

function fetchPaymentsOnPaySuccess(action$, store) {
  return (
    action$.ofType(PAY_SUCCESS, SET_PAYMENT_PENDING_SUCCESS)
      .map(createSearchAction(store))
  );
}

function searchOnParametersChange(action$, store) {

  return (
    Observable
      .merge(
        action$.ofType(SET_FILTER_FROM_DATE),
        action$.ofType(SET_FILTER_TO_DATE),
        action$.ofType(SET_FILTER_STATUS)
      )
      .debounceTime(700)
      .map(createSearchAction(store))
  );

}

function createSearchAction(store) {

  return function () {
    const {fromDate, toDate, status} = (
      store.getState().payment.report.parameters
    );

    return fetchPayments({
      fromDate,
      toDate,
      status
    });
  }

}
