
const FETCH_PAYMENTS = "FETCH_PAYMENTS";
const FETCH_PAYMENTS_SUCCESS = "FETCH_PAYMENTS_SUCCESS";
const FETCH_PAYMENTS_FAILURE = "FETCH_PAYMENTS_FAILURE";


export const ACTION_TYPES = Object.freeze({
    FETCH_PAYMENTS,
    FETCH_PAYMENTS_SUCCESS,
    FETCH_PAYMENTS_FAILURE
});


export function fetchPayments() {
	return {
		type: FETCH_PAYMENTS
	};
}

export function fetchPaymentsSuccess({payments = []}) {
	return {
		type: FETCH_PAYMENTS_SUCCESS,
		payments
	};
}

export function fetchPaymentsFailure({error}) {
	return {
		type: FETCH_PAYMENTS_FAILURE,
		error
	};
}