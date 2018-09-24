import React from "react";

import {state$} from "app/state/app.store";
// import {state$} from "../state/app.store";
import {rxDom} from "utils";
import Modal from "./utils/Modal.component";
import Toast from "./utils/Toast.component";
import {createLogger} from "app/services/log/log.service";
import PaymentReport from "./payments/PaymentReport.component";

// eslint-disable-next-line no-unused-vars
const log = createLogger("ui/MainView.component");

export default MainView;

function MainView() {

    const route$ = state$.pluck("router", "route").distinctUntilChanged();

    const currentView$ = (
        route$
            .pluck("name")
            .distinctUntilChanged()
            //.combineLatest(loginStatus$)
            .map(function (routeName) {

                //if (loginStatus !== CONNECTED) {
                //    return <LoginView/>;
                //}

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

    return (

        <div role="main" id="main-content">
            <div className="container">
                <rxDom.div className="row">{
                    currentView$
                }</rxDom.div>
            </div>
            {/*<Modal/>*/}
            {/*<Toast/>*/}
        </div>

    );

    function leaving(routeName) {
        return route$.filter((route) => route.name !== routeName)
    }

}

