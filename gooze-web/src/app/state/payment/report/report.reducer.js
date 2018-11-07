
import {ACTION_TYPES} from "./report.actions";

const {
  FETCH_PAYMENTS_SUCCESS,
  FETCH_PAYMENTS_FAILURE,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE,
  SET_FILTER_STATUS,
  TOGGLE_PAYMENT_SELECTION,
  SET_PAYMENT_AMOUNT,
  PAY,
  PAY_SUCCESS,
  PAY_FAILURE,
  SET_PAYMENT_PENDING,
  SET_PAYMENT_PENDING_SUCCESS,
  SET_PAYMENT_PENDING_FAILURE
} = ACTION_TYPES;

const defaultState = Object.freeze({
  parameters: Object.freeze({
    fromDate: "",
    toDate: "",
    status: ""
  }),
	results: Object.freeze({
		payments: Object.freeze({}),
		error: undefined
	}),
  loading: false,
  error: undefined
});

export default report;

function report(state = defaultState, action = {}) {

	const {type} = action;

	switch (type) {

		case FETCH_PAYMENTS_SUCCESS: {

			const {payments} = action;
			const error = undefined;

			return {
				...state,
          results: Object.freeze({
              payments: Object.freeze(payments),
              error
          })
			};
		}

		case FETCH_PAYMENTS_FAILURE: {
			const {error} = action;

			return {
				...state,
        results: Object.freeze({
					payments: Object.freeze({}),
          error
        })
			};
		}

    case SET_FILTER_FROM_DATE: {
      const {fromDate} = action;
      const {parameters} = state;

      return {
        ...state,
        parameters: Object.freeze({
          ...parameters,
          fromDate
        })
      };
    }

    case SET_FILTER_TO_DATE: {
      const {toDate} = action;
      const {parameters} = state;

      return {
        ...state,
        parameters: Object.freeze({
          ...parameters,
          toDate
        })
      };
    }

    case SET_FILTER_STATUS: {
      const {status} = action;
      const {parameters} = state;

      return {
        ...state,
        parameters: Object.freeze({
          ...parameters,
          status
        })
      };
    }

    case TOGGLE_PAYMENT_SELECTION: {
      const {payment} = action;
      const {results} = state;
      const {payments} = results;

      // TODO: at init separete payments array and grouped payments
      const oldPayment = payments[payment.username];

      return {
        ...state,
        results: Object.freeze({
          ...results,
          payments: Object.freeze({
            ...payments,
            [payment.username]: Object.freeze({
              ...oldPayment,
              payments: Object.freeze(oldPayment.payments.map(
                (resultsPayment) => (
                  resultsPayment === payment ?
                    {...resultsPayment, isSelected: !resultsPayment.isSelected} :
                    resultsPayment
                )
              ))
            })
          })
        })
      };
    }

    case SET_PAYMENT_AMOUNT: {

      const {payment, paidAmount} = action;
      const {results} = state;
      const {payments} = results;
      const oldPayment = payments[payment.username];

      return {
        ...state,
        results: Object.freeze({
          ...results,
          payments: Object.freeze({
            ...payments,
            [payment.username]: Object.freeze({
              ...oldPayment,
              payments: Object.freeze(oldPayment.payments.map(
                (resultsPayment) => (
                  resultsPayment === payment ?
                    {...resultsPayment, paidAmount} :
                    resultsPayment
                )
              ))
            })
          })
        })
      };
    }

    case PAY: {
      return {
        ...state,
        loading: true
      };
    }

    case PAY_SUCCESS: {
      return {
        ...state,
        loading: false
      };
    }

    case PAY_FAILURE: {

      const {error} = action;

      return {
        ...state,
        loading: false,
        error
      };
    }

    case SET_PAYMENT_PENDING: {
      return {
        ...state,
        loading: true
      };
    }

    case SET_PAYMENT_PENDING_SUCCESS: {
      return {
        ...state,
        loading: false
      };
    }

    case SET_PAYMENT_PENDING_FAILURE: {

      const {error} = action;

      return {
        ...state,
        loading: false,
        error
      };
    }

		default: {
			return state;
		}
	}
}

