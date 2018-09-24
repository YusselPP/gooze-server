
import React from "react";
import {Observable} from "rxjs/Observable";
import PropTypes from "prop-types";
import {assert, ensure, fp, rxDom} from "utils";

import "./BooleanSwitch.styles.scss"

const idGenerator = fp.prefixedSequence("boolean-switch-");

export default BooleanSwitch;

function BooleanSwitch({id, value$, onSwitchToggle, children}) {

    id = assert.string(id) ? id : idGenerator();
    onSwitchToggle = ensure.function(onSwitchToggle);

    return (
        <div className="checkbox toggle-switch right lv-switch">
            <rxDom.input id={id}
                   type="checkbox"
                   checked={value$}
                   onChange={onSwitchToggle}
            />
            <label htmlFor={id}>
                {children}&nbsp;
            </label>
        </div>
    );

}

BooleanSwitch.propTypes = {
    id: PropTypes.string,
    value$: PropTypes.instanceOf(Observable),
    onSwitchToggle: PropTypes.func,
    children: PropTypes.any
};