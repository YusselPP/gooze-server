
import {combineReducers} from "redux";
import {ACTION_TYPES} from "./report.actions";

const {
    FETCH_PAYMENTS,
    FETCH_PAYMENTS_SUCCESS,
    FETCH_PAYMENTS_FAILURE
} = ACTION_TYPES;

const defaultState = {
	results: {
		payments: [],
		error: undefined
	}
};

export default report;

function report(state = defaultState, action = {}) {

	const {type} = action;

	switch (type) {

		case FETCH_PAYMENTS_SUCCESS: {

			const {payments} = action;
			const error = undefined;

			return {
				...state,
                results: {
                    payments,
                    error
                }
			};
		}

		case FETCH_PAYMENTS_FAILURE: {
			const {error} = action;

			return {
				...state,
                results: {
					payments: [],
                    error
                }
			};
		}

		default: {
			return state;
		}
	}
}

