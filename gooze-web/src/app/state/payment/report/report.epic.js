
import {Observable} from "rxjs/Observable";
import {ACTION_TYPES, fetchPayments, fetchPaymentsSuccess, fetchPaymentsFailure} from "./report.actions";
import {combineEpics} from "redux-observable";

import appConfig from "app/app.config";
import {createLogger} from "app/services/log/log.service";
import {errorMessage} from "utils";

const log = createLogger("state/payment/report/report.epic");

const {

	FETCH_PAYMENTS

} = ACTION_TYPES;

export default combineEpics(
	performPaymentsFetch
);

function performPaymentsFetch(action$, store) {
	return (
		action$
			.ofType(FETCH_PAYMENTS)
			.switchMap(function () {

				try {

                    return (
                        Observable
                            .ajax({
                                url: `${appConfig.apiPath}/UserTransactions/paymentReport`,
                                responseType: "json",
                                headers: {
                                	"Authorization": "AnRfWStyY4l7Lj8BwJJ7ZypRijxMsSUHDo594vccT9Lnc1ZfwsIWiesdQ4S4V8NC",
                                    "Content-Type": "application/json"
                                }
                            })
                            .map(({response}) => fetchPaymentsSuccess({payments: response}))
                            .catch(function (error) {

                                const msg = `Can't access payments: ${errorMessage(error)}`;

                                log.error(msg, error);
                                // toastError(msg);

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

function createSearchUserAction(store) {

	return function () {
		const {search} = store.getState().users;
		const {parameters} = search;
		const {searchString, withCreations, withPersonalizations} = parameters;

		return searchUsers({
			searchString,
			withCreations,
			withPersonalizations
		});
	}

}