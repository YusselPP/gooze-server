import {combineEpics} from "redux-observable";
import paymentEpic from "./payment/payment.epic";
import toastAlertsEpic from "./toastAlerts/toastAlerts.epic";

export default combineEpics(
    paymentEpic,
    toastAlertsEpic
);