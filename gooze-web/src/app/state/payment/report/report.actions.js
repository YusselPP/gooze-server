
const FETCH_PAYMENTS = "FETCH_PAYMENTS";
const FETCH_PAYMENTS_SUCCESS = "FETCH_PAYMENTS_SUCCESS";
const FETCH_PAYMENTS_FAILURE = "FETCH_PAYMENTS_FAILURE";
const SET_FILTER_FROM_DATE = "SET_FILTER_FROM_DATE";
const SET_FILTER_TO_DATE = "SET_FILTER_TO_DATE";
const SET_FILTER_STATUS = "SET_FILTER_STATUS";


export const ACTION_TYPES = Object.freeze({
    FETCH_PAYMENTS,
    FETCH_PAYMENTS_SUCCESS,
    FETCH_PAYMENTS_FAILURE,
  SET_FILTER_FROM_DATE,
  SET_FILTER_TO_DATE,
  SET_FILTER_STATUS
});


export function fetchPayments({fromDate, toDate, status} = {}) {
	return {
		type: FETCH_PAYMENTS,
    fromDate,
    toDate,
    status
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

export function setFilterFromDate({fromDate}) {
  return {
    type: SET_FILTER_FROM_DATE,
    fromDate
  };
}

export function setFilterToDate({toDate}) {
  return {
    type: SET_FILTER_TO_DATE,
    toDate
  };
}

export function setFilterStatus({status}) {
  return {
    type: SET_FILTER_STATUS,
    status
  };
}
