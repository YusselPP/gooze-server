
import {AjaxError} from "rxjs/observable/dom/AjaxObservable";
import ensure from "./ensure";

const UNAUTHORIZED = 401;
const NOT_FOUND = 404;

export default errorMessage;

function errorMessage(error) {

    if (error instanceof AjaxError) {
        return ajaxErrorMessage(error);
    }

    return ensure.string(error, ensure.string(ensure.object(error).message));

}

function ajaxErrorMessage(error) {
    const {status} = error;
    switch (status) {
        case UNAUTHORIZED: {
            return "You aren't authorized to perform this action";
        }
        case NOT_FOUND: {
            return "This resource/service couldn't be found";
        }
        default: {
            return "Unexpected server error"
        }
    }
}
