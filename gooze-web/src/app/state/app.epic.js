import {combineEpics} from "redux-observable";
import auth from "./auth/auth.epic";
import paymentEpic from "./payment/payment.epic";
import toastAlertsEpic from "./toastAlerts/toastAlerts.epic";

export default combineEpics(
    auth,
    paymentEpic,
    toastAlertsEpic
);
