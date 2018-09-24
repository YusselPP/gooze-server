
import {Observable} from "rxjs/Observable"
import{ACTION_TYPES, removeToastAlert} from "./toastAlerts.actions";

const {ADD_TOAST_ALERT} = ACTION_TYPES;

export default autoDismiss;

function autoDismiss(action$) {
	return (
		action$
			.ofType(ADD_TOAST_ALERT)
			.mergeMap(function({alert}) {
				return(
					Observable.of(removeToastAlert({id:alert.id})).delay(5000)
				)
			})
	)
}