
import {Observable} from "rxjs/Observable";
import {ACTION_TYPES, fetchPayments, fetchPaymentsSuccess, fetchPaymentsFailure} from "./report.actions";
import {combineEpics} from "redux-observable";

import appConfig from "app/app.config";
import {createLogger} from "app/services/log/log.service";
import {errorMessage} from "utils";
import {toastError} from "../../../ui/utils/ToastAlerts.service";
import {assert} from "../../../../utils";

const log = createLogger("state/payment/report/report.epic");

const {

	FETCH_PAYMENTS,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE

} = ACTION_TYPES;

export default combineEpics(
	performPaymentsFetch,
  searchOnParametersChange
);

function performPaymentsFetch(action$, store) {
	return (
		action$
			.ofType(FETCH_PAYMENTS)
			.switchMap(function ({fromDate, toDate}) {
				try {

          return (
              Observable
                  .ajax({
                      url: `${appConfig.apiPath}/UserTransactions/paymentReport?fromDate=${fromDate}&toDate=${toDate}`,
                      responseType: "json",
                      headers: {
                        "Authorization": "AnRfWStyY4l7Lj8BwJJ7ZypRijxMsSUHDo594vccT9Lnc1ZfwsIWiesdQ4S4V8NC",
                        "Content-Type": "application/json"
                      }
                  })
                  .map(({response}) => fetchPaymentsSuccess({payments: response}))
                  .catch(function (err) {

                      const {response} = err;
                      const error = assert.object(response) ? response.error : error;

                      const msg = `Can't access payments: ${errorMessage(error)}`;

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

function searchOnParametersChange(action$, store) {

  return (
    Observable
      .merge(
        action$.ofType(SET_FILTER_FROM_DATE),
        action$.ofType(SET_FILTER_TO_DATE)
      )
      .debounceTime(500)
      .map(createSearchAction(store))
  );

}

function createSearchAction(store) {

  return function () {
    const {fromDate, toDate} = (
      store.getState().payment.report.parameters
    );

    return fetchPayments({
      fromDate,
      toDate
    });
  }

}
