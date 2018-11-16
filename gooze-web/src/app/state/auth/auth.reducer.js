
import {ACTION_TYPES} from "./auth.actions";

const {
  SET_USERNAME,
  SET_PASSWORD,

  LOAD_TOKEN,

  LOGIN,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,

  LOGOUT,
  LOGOUT_SUCCESS,
  LOGOUT_FAILURE
} = ACTION_TYPES;

const tokenKey = "gooze-token";

const defaultState = Object.freeze({
  username: "",
  password: "",
  token: undefined,
  isLogged: false,
  loggingIn: false,
  loggingOut: false,
  error: undefined
});

export default report;

function report(state = defaultState, action = {}) {

  const {type} = action;

  switch (type) {

    case SET_USERNAME: {

      const {username} = action;

      return {
        ...state,
        username
      };
    }

    case SET_PASSWORD: {

      const {password} = action;

      return {
        ...state,
        password
      };
    }

    case LOAD_TOKEN: {

      const token = localStorage.getItem(tokenKey);

      if (typeof token !== "string") {
        return state;
      }

      return {
        ...state,
        isLogged: true,
        token,
      };
    }

    case LOGIN: {

      const error = undefined;

      return {
        ...state,
        loggingIn: true,
        error
      };
    }

    case LOGIN_SUCCESS: {

      const {token} = action;
      localStorage.setItem(tokenKey, token);

      return {
        ...state,
        loggingIn: false,
        isLogged: true,
        token
      };
    }

    case LOGIN_FAILURE: {

      const {error} = action;

      return {
        ...state,
        loggingIn: false,
        error
      };
    }

    case LOGOUT: {

      const error = undefined;

      localStorage.removeItem(tokenKey);

      return {
        ...state,
        loggingOut: true,
        error
      };
    }

    case LOGOUT_SUCCESS: {

      return {
        ...state,
        loggingOut: false,
        isLogged: false,
        token: undefined
      };
    }

    case LOGOUT_FAILURE: {

      const {error} = action;

      return {
        ...state,
        loggingOut: false,
        error
      };
    }

    default: {
      return state;
    }
  }
}
