
const SET_USERNAME = "SET_USERNAME";
const SET_PASSWORD = "SET_PASSWORD";

const LOAD_TOKEN = "LOAD_TOKEN";

const LOGIN = "LOGIN";
const LOGIN_SUCCESS = "LOGIN_SUCCESS";
const LOGIN_FAILURE = "LOGIN_FAILURE";

const LOGOUT = "LOGOUT";
const LOGOUT_SUCCESS = "LOGOUT_SUCCESS";
const LOGOUT_FAILURE = "LOGOUT_FAILURE";




export const ACTION_TYPES = Object.freeze({
  SET_USERNAME,
  SET_PASSWORD,

  LOAD_TOKEN,

  LOGIN,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,

  LOGOUT,
  LOGOUT_SUCCESS,
  LOGOUT_FAILURE
});

export function setUsername({username}) {
  return {
    type: SET_USERNAME,
    username
  };
}

export function setPassword({password}) {
  return {
    type: SET_PASSWORD,
    password
  };
}

export function loadToken() {
  return {
    type: LOAD_TOKEN,
  };
}

export function login() {
	return {
		type: LOGIN
	};
}

export function loginSuccess({token}) {
	return {
		type: LOGIN_SUCCESS,
    token
	};
}

export function loginFailure({error}) {
	return {
		type: LOGIN_FAILURE,
		error
	};
}


export function logout() {
  return {
    type: LOGOUT
  };
}

export function logoutSuccess() {
  return {
    type: LOGOUT_SUCCESS
  };
}

export function logoutFailure({error}) {
  return {
    type: LOGOUT_FAILURE,
    error
  };
}

