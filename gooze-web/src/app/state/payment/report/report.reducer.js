
import {ACTION_TYPES} from "./report.actions";

const {
  FETCH_PAYMENTS,
  FETCH_PAYMENTS_SUCCESS,
  FETCH_PAYMENTS_FAILURE,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE
} = ACTION_TYPES;

const defaultState = {
  parameters: {
    fromDate: undefined,
    toDate: undefined
  },
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

    case SET_FILTER_FROM_DATE: {
      const {fromDate} = action;
      const {parameters} = state;

      return {
        ...state,
        parameters: {
          ...parameters,
          fromDate
        }
      };
    }

    case SET_FILTER_TO_DATE: {
      const {toDate} = action;
      const {parameters} = state;

      return {
        ...state,
        parameters: {
          ...parameters,
          toDate
        }
      };
    }

		default: {
			return state;
		}
	}
}

