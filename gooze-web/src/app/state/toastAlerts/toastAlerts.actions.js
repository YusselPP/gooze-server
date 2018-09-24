

const ADD_TOAST_ALERT = "ADD_TOAST_ALERT";
const REMOVE_TOAST_ALERT = "REMOVE_TOAST_ALERT";

export const ACTION_TYPES = Object.freeze({
	ADD_TOAST_ALERT,
	REMOVE_TOAST_ALERT
});

export function addToastAlert({alert}) {
	return{
		type: ADD_TOAST_ALERT,
		alert
	};
}

export function removeToastAlert({id}) {
	return{
		type: REMOVE_TOAST_ALERT,
		id
	};
}