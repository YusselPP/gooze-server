
import {combineReducers} from "redux";

import report from "./report/report.reducer";

const paymentReducer = combineReducers({
    report
});

export default paymentReducer;
