
import {combineEpics} from "redux-observable";
import {Observable} from "rxjs/Observable";

import appConfig from "app/app.config";
import {assert} from "utils";
import {createLogger} from "app/services/log/log.service";

import {
  loginSuccess,
  loginFailure,
  logoutSuccess,
  logoutFailure,
  ACTION_TYPES
} from "./auth.actions";

const {
  LOGIN,
  LOGOUT
} = ACTION_TYPES;

const log = createLogger("/app/state/users/users.epic");

export default combineEpics(
  performLogin,
  performLogout
);

function performLogin(action$, store) {
  return (
    action$
      .ofType(LOGIN)
      .switchMap(function () {

        try {
          const {auth} = store.getState();
          const {username, password} = auth;

          return (
            Observable
              .ajax({
                url: `${appConfig.apiPath}/GoozeUsers/login`,
                method: "POST",
                responseType: "json",
                headers: {
                  "Content-Type": "application/json"
                },
                body: {
                  email: username,
                  password
                }
              })
              .map(({response}) => loginSuccess({token: response.id}))
              .catch(function (err) {

                const {response} = err;
                const error = assert.object(response) ? response.error : err;

                log.error(error);

                return Observable.of(loginFailure({error}));
              })

          );

        } catch (error) {

          log.error(error);

          return Observable.of(
            loginFailure({error})
          );
        }

      })
  );
}

function performLogout(action$, store) {
  return (
    action$
      .ofType(LOGOUT)
      .switchMap(function () {

        try {
          const {auth} = store.getState();

          return (
            Observable
              .ajax({
                url: `${appConfig.apiPath}/GoozeUsers/logout`,
                method: "POST",
                responseType: "json",
                headers: {
                  "Authorization": auth.token,
                  "Content-Type": "application/json"
                }
              })
              .mapTo(logoutSuccess())
              .catch(function (err) {

                const {response} = err;
                const error = assert.object(response) ? response.error : err;

                log.error(error);

                return Observable.of(logoutFailure({error}));
              })

          );

        } catch (error) {

          log.error(error);

          return Observable.of(
            logoutFailure({error})
          );
        }

      })
  );
}
