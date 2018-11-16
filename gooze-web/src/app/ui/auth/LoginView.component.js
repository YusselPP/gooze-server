/**
 * Created by yparedes on 11/15/18.
 */
import React from "react";
import classNames from "classnames";

import {rxDom} from "utils";
import {dispatch, state$} from "../../state/app.store";
import {
  setUsername,
  setPassword,
  login
} from "../../state/auth/auth.actions";


export default LoginView;

function LoginView() {

  const auth$ = state$.pluck("auth");

  const username$ = auth$.pluck("username");
  const password$ = auth$.pluck("password");

  const loggingIn$ = auth$.pluck("loggingIn");

  const loginButtonClasses$ = (
    loggingIn$
      .map((loading) => (
        classNames (
          "btn btn-outline-primary",
          "with-loader",
          {
            loading
          }
        )
      ))
  );

	return (
      <div className="col-lg-4 mx-auto mt-4">
          <form className="form mb-3" onSubmit={handleLoginSubmit}>

              <div className="form-group">

                  <label className="">Usuario:</label>
                  <rxDom.input type="text" className="form-control" onChange={handleUsernameChange} value={username$}/>
              </div>

              <div className="form-group">
                  <label className="">Contraseña:</label>
                  <rxDom.input type="password" className="form-control" onChange={handlePasswordChange} value={password$}/>
              </div>

              <div className="d-flex justify-content-center p-2">
                  <rxDom.button type="submit" className={loginButtonClasses$}>Iniciar sesión</rxDom.button>
              </div>

          </form>
      </div>
	);
}

function handleUsernameChange(event) {
  const username = event.target.value;
  dispatch(setUsername({username}));
}

function handlePasswordChange(event) {
  const password = event.target.value;
  dispatch(setPassword({password}));
}

function handleLoginSubmit(event) {
  event.preventDefault();
  dispatch(login());
}


