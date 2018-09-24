import {combineReducers} from "redux";
import {router5Reducer as router} from "redux-router5";
import payment from "./payment/payment.reducer"
import toastAlerts from "./toastAlerts/toastAlerts.reducer"


const appReducer = combineReducers({
	router,
	payment,
    toastAlerts
});

export default appReducer;