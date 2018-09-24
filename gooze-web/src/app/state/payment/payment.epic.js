
import {combineEpics} from "redux-observable";
import {Observable} from "rxjs/Observable";

import reportEpic from "./report/report.epic";

import {errorMessage} from "utils";
import {createLogger} from "app/services/log/log.service";
import {toastError} from "app/ui/utils/ToastAlerts.service";

const log = createLogger("/app/state/users/users.epic");

export default combineEpics(
	reportEpic
);

