

import {ACTION_TYPES} from "./toastAlerts.actions";

const {ADD_TOAST_ALERT, REMOVE_TOAST_ALERT} = ACTION_TYPES;

export default function (state = [], action) {

	const {type} = action;

	switch (type) {

		case ADD_TOAST_ALERT: {
			const {alert} = action;
			return [...state, alert];
		}

		case REMOVE_TOAST_ALERT: {
			const {id} = action;
			return state.filter((element) => element.id !== id);
		}

		default: {
			return state;
		}

	}
}