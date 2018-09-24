
import {addToastAlert} from "../../state/toastAlerts/toastAlerts.actions";
import {removeToastAlert} from "../../state/toastAlerts/toastAlerts.actions";
import {dispatch} from "../../state/app.store";
import {fp} from "utils";
import {SEVERITY_TYPES} from "utils";

const idGenerator = fp.prefixedSequence("toastAlert");

export function toastDefault(body){
	toast(SEVERITY_TYPES.LOG, body);
}
export function toastInfo(body){
	toast(SEVERITY_TYPES.INFO, body);
}
export function toastSuccess(body){
	toast(SEVERITY_TYPES.SUCCESS, body);
}
export function toastWarning(body){
	toast(SEVERITY_TYPES.WARNING, body);
}
export function toastError(body){
	toast(SEVERITY_TYPES.ERROR, body);
}
export function dismissToast(id){
	dispatch(removeToastAlert({id}))
}

function toast(level, body){
	const alert = {
		id: idGenerator(),
		level: level,
		body: body
	};
	dispatch(addToastAlert({alert}))
}