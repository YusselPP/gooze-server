
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import $ from "jquery";
import {state$} from "app/state/app.store";
import {createLogger} from "app/services/log/log.service";

const log = createLogger("/ui/utils/Modal.component");

const defaultContent = {
    title: "",
    body: "",
    closeText: "Close",
    actions: ""
};

let modalEle;

export const modalHidden$ = new Subject();
export const routeChanged$ = new BehaviorSubject(false);
export const modalContent$ = new BehaviorSubject(defaultContent);


export function openModal({title, body, closeText, actions}) {


    if (!isValidTitle(title)) {
        throw(new Error("Invalid title type. Must be of type 'string' or 'react.element'"));
    }

    if (!isValidBody(body)) {
        throw(new Error("Invalid body type. Must be of type 'string' or 'react.element'"));
    }

    if (closeText) {
        if (!isValidCloseText(closeText)) {
            throw(new Error("Invalid closeText type. Must be of type 'string' or 'react.element'"));
        }
    } else {
        closeText = defaultContent.closeText;
    }

    if (actions) {
        if (!isValidActions(actions)) {
            throw(new Error("Invalid actions type. Must be of type 'react.element'"));
        }
    } else {
        actions = defaultContent.actions;
    }


    modalContent$.next({title, body, closeText, actions});

    modalEle.modal("show");
}

export function initModal() {
    modalEle = $("#lv-modal");
    modalEle.modal({
        show: false
    });

    modalEle.on("show.bs.modal", function () {
        log.debug("Modal will show");
        log.debug("Listening for route changes to close the modal");
        state$.pluck("router", "route", "name")
            .distinctUntilChanged()
            .skip(1)
            .takeUntil(modalHidden$)
            .subscribe(function () {
                log.debug("Route changed. Modal will hide when finished showing");
                routeChanged$.next(true);
            })
    });

    modalEle.on("shown.bs.modal", function () {
        log.debug("Modal shown");
        log.debug("Listening for route changes to close the modal");
        routeChanged$
            .takeUntil(modalHidden$)
            .filter((changed) => changed)
            .subscribe(function () {
                log.debug("Route changed. Hiding modal");
                modalEle.modal("hide");
                routeChanged$.next(false);
            })
    });

    modalEle.on("hidden.bs.modal", function () {
        log.debug("Modal hidden");
        // clean modal content
        log.debug("Cleaning modal content");
        modalContent$.next(defaultContent);
        modalHidden$.next();
    });
}

function isValidTitle(title) {
    return typeof title === "string" || title.$$typeof === Symbol.for("react.element")
}
function isValidBody(body) {
    return typeof body === "string" || body.$$typeof === Symbol.for("react.element")
}
function isValidCloseText(closeText) {
    return typeof closeText === "string" || closeText.$$typeof === Symbol.for("react.element")
}
function isValidActions(actions) {
    return actions.$$typeof === Symbol.for("react.element")
}