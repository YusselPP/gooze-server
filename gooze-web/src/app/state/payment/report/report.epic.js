
import {Observable} from "rxjs/Observable";
import {ACTION_TYPES, fetchPayments, fetchPaymentsSuccess, fetchPaymentsFailure} from "./report.actions";
import {combineEpics} from "redux-observable";

import appConfig from "app/app.config";
import {createLogger} from "app/services/log/log.service";
import {errorMessage} from "utils";
import {toastError} from "../../../ui/utils/ToastAlerts.service";
import {assert} from "../../../../utils";

import moment from "moment-timezone";

const log = createLogger("state/payment/report/report.epic");

const {

	FETCH_PAYMENTS,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE,
  SET_FILTER_STATUS

} = ACTION_TYPES;

export default combineEpics(
	performPaymentsFetch,
  searchOnParametersChange
);

function performPaymentsFetch(action$, store) {
	return (
		action$
			.ofType(FETCH_PAYMENTS)
			.switchMap(function ({fromDate, toDate, status}) {
				try {
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
