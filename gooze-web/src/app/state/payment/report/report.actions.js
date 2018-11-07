
const FETCH_PAYMENTS = "FETCH_PAYMENTS";
const FETCH_PAYMENTS_SUCCESS = "FETCH_PAYMENTS_SUCCESS";
const FETCH_PAYMENTS_FAILURE = "FETCH_PAYMENTS_FAILURE";
const SET_FILTER_FROM_DATE = "SET_FILTER_FROM_DATE";
const SET_FILTER_TO_DATE = "SET_FILTER_TO_DATE";
const SET_FILTER_STATUS = "SET_FILTER_STATUS";

const TOGGLE_PAYMENT_SELECTION = "TOGGLE_PAYMENT_SELECTION";
const SET_PAYMENT_AMOUNT = "SET_PAYMENT_AMOUNT";

const PAY = "PAY";
const PAY_SUCCESS = "PAY_SUCCESS";
const PAY_FAILURE = "PAY_FAILURE";

const SET_PAYMENT_PENDING = "SET_PAYMENT_PENDING";
const SET_PAYMENT_PENDING_SUCCESS = "SET_PAYMENT_PENDING_SUCCESS";
const SET_PAYMENT_PENDING_FAILURE = "SET_PAYMENT_PENDING_FAILURE";

export const ACTION_TYPES = Object.freeze({
    FETCH_PAYMENTS,
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
});

export const payStatus = Object.freeze({
  pending: "pending",
  paid: "paid",
  review: "review"
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

export function togglePaymentSelection({payment}) {
  return {
    type: TOGGLE_PAYMENT_SELECTION,
    payment
  };
}

export function setPaymentAmount({payment, paidAmount}) {
  return {
    type: SET_PAYMENT_AMOUNT,
    payment,
    paidAmount
  };
}

export function pay() {
  return {
    type: PAY
  };
}

export function paySuccess() {
  return {
    type: PAY_SUCCESS
  };
}

export function payFailure({error}) {
  return {
    type: PAY_FAILURE,
    error
  };
}

export function setPaymentPending() {
  return {
    type: SET_PAYMENT_PENDING
  };
}

export function setPaymentPendingSuccess() {
  return {
    type: SET_PAYMENT_PENDING_SUCCESS
  };
}

export function setPaymentPendingFailure({error}) {
  return {
    type: SET_PAYMENT_PENDING_FAILURE,
    error
  };
}
