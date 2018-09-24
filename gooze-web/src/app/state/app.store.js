import {createEpicMiddleware} from "redux-observable";
import {createStore, applyMiddleware, compose} from "redux";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {router5Middleware} from "redux-router5";

import appReducer from "./app.reducer";
import appEpic from "./app.epic";
import router from "../app.router";
import {createLogger} from "../services/log/log.service";

const log = createLogger("/app/state/app.store");

const initialState = {
    router: {
        route: router.getState(),
        previousRoute: null,
        transitionRoute: null,
        transitionError: null,
    }
};

const epicMiddleware = createEpicMiddleware(appEpic);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    serialize: true
}) : compose;

const store = createStore(
    appReducer,
    initialState,
    composeEnhancers(
        applyMiddleware(
            epicMiddleware,
            router5Middleware(router)
        )
    )
);

export function dispatch(action) {
    store.dispatch(action);
}

const stateSubject = new BehaviorSubject(store.getState());
export const state$ = stateSubject.distinctUntilChanged();

store.subscribe(
    () => stateSubject.next(store.getState()),
    (error) => log.error(error),
    () => log.info("redux store closed")
);

// attempt to login (recover current session)
//store.dispatch(connect({}));
