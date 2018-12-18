import React from "react";

import {state$, dispatch} from "app/state/app.store";
import {rxDom, errorMessage} from "utils";
import Toast from "./utils/Toast.component";
import {createLogger} from "app/services/log/log.service";
import PaymentReport from "./payments/PaymentReport.component";
import SupportForm from "./support/SupportForm.component";
import LoginView from "./auth/LoginView.component"
import {logout} from "../state/auth/auth.actions";
import classNames from "classnames";

// eslint-disable-next-line no-unused-vars
const log = createLogger("ui/MainView.component");

export default MainView;

function MainView() {

    const route$ = state$.pluck("router", "route").distinctUntilChanged();
    const isLogged$ = state$.pluck("auth", "isLogged").distinctUntilChanged();

    const currentView$ = (
        route$
            .pluck("name")
            .distinctUntilChanged()
            .combineLatest(isLogged$)
            .map(function ([routeName, isLogged]) {

                if (routeName === "support") {
                  return <SupportForm/>;
                }

                if (!isLogged) {
                    return <LoginView/>;
                }

                switch (routeName) {

                    case "payment.report": {

                        // const leavingRoute$ = leaving("payment.report");

                        return <PaymentReport/>;
                    }

                    default: {
                        return <div>Page not found</div>;
                    }

                }

            })
    );

    const loggingOut$ = state$.pluck("auth", "loggingOut");
    const error$ = state$.pluck("auth", "error");

    const logoutButtonClasses$ = (
      loggingOut$
        .map((loading) => (
          classNames (
            "btn btn-sm btn-outline-secondary",
            "with-loader",
            {
              loading
            }
          )
        ))
    );

    const logoutButtonDisabled$ = (
      loggingOut$
        .map((loggingOut) => loggingOut)
    );

    return (

        <div role="main" id="main-content">
            <div className="container">

                <rxDom.div className="p-2">{
                  error$.map((error, i) => (
                    error !== undefined ?
                      <div key={i} className="alert alert-danger">{errorMessage(error)}
                        <button type="button" className="close" data-dismiss="alert" aria-label="Close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div> : ""
                  ))
                }</rxDom.div>

                <rxDom.div className="d-flex justify-content-end">{
                  isLogged$.map((isLogged) =>
                    isLogged ? <rxDom.button type="button" className={logoutButtonClasses$} disabled={logoutButtonDisabled$} onClick={() => dispatch(logout())}>Salir</rxDom.button> : ""
                  )
                }</rxDom.div>

                <rxDom.div className="row">{
                    currentView$
                }</rxDom.div>
            </div>
            {/*<Modal/>*/}
            <Toast/>
        </div>

    );

    function leaving(routeName) {
        return route$.filter((route) => route.name !== routeName)
    }

}

