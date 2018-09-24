
import React from "react";
import DOM from "react-dom-factories";
import {Observable} from "rxjs/Observable";

export function reactive(reactClass) {
    return createReactiveClass(reactClass);
}

export const rxDom = Object.keys(DOM).reduce((result, tag) => {
    result[tag] = createReactiveClass(tag);
    return result;
}, {});

function createReactiveClass(tag) {
    class ReactiveClass extends React.Component {
        constructor(props) {
            super(props);
            this.displayName = `ReactiveElement-${String(tag)}`;
            this.state = pickProps(props, (key, value) => !isRxObservable(value));
            this.state.mount = true;

            if (tag !== React.Fragment) {
                this.element = React.createRef();
            }

        }

        componentWillMount() {
            this.subscribe(this.props);
        }

        componentWillReceiveProps(nextProps) {
            this.subscribe(nextProps);
        }

        componentWillUnmount() {
            this.unsubscribe();
        }

        addPropListener(name, prop$) {
            return prop$.subscribe((value) => {
                // don't re-render if value is the same.
                if (value === this.state[name]) {
                    return;
                }

                const prop = {};
                prop[name] = value;
                this.setState(prop);
            });
        }

        subscribe(props) {
            if (this.subscriptions) {
                this.unsubscribe();
            }

            this.subscriptions = [];

            Object.keys(props).forEach((key) => {
                const value = props[key];
                if (isRxObservable(value)) {
                    const subscription = this.addPropListener(key, value);
                    this.subscriptions.push(subscription);
                }
            });
        }

        unsubscribe() {
            this.subscriptions.forEach( (subscription) => subscription.unsubscribe());
            this.subscriptions = null;
        }

        render() {
            if (!this.state.mount) {
                return null;
            }

            const finalProps = pickProps(this.state, (key) => key !== "mount");

            if (this.element !== undefined) {
                finalProps.ref = this.element;
            }

            return React.createElement(tag, finalProps);
        }
    }

    return ReactiveClass;
}

export function isRxObservable(o) {
    return (
        typeof o === "object"
        && o instanceof Observable
    );
}

export function pickProps(props, validator) {
    const picked = {};

    Object.keys(props).forEach((key) => {
        const value = props[key];
        if (validator(key, value)) {
            picked[key] = value;
        }
    });

    return picked;
}
