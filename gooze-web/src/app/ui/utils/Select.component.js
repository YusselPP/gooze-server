
import React from "react";
import {Observable} from "rxjs/Observable";
import {combineLatest} from "rxjs/observable/combineLatest";
import PropTypes from "prop-types";

import {ensure, rxDom} from "utils";
import SelectOption from "./SelectOption.component";

import "./Select.styles.scss";

export default Select;

/**
 *
 * @param {Observable<Array>} options$
 * @param {Observable<Array>} selectedValues$
 * @param {Boolean} multiple
 * @param {Function} onSelectionChange
 */
function Select({options$, selectedValues$, multiple, onSelectionChange}) {

    const combined$ = combineLatest(options$, selectedValues$).distinctUntilChanged();


    multiple = ensure.boolean(multiple);
    onSelectionChange = ensure.function(onSelectionChange);


    return (
        <div className="lv-select rounded h-100">
            <rxDom.ul className="options">{
                combined$.map(([options, selectedValues]) => {
                    return options.map((option, i) =>
                        <li key={i} onClick={createClickHandler(option, selectedValues, onSelectionChange)}>
                            <SelectOption title={option.title} isSelected={isSelected(option, selectedValues)}/>
                        </li>
                    );
                })
            }</rxDom.ul>
        </div>
    );


    function isSelected(option, selectedValues) {
        return selectedValues.indexOf(option.value) !== -1;
    }

    function createClickHandler(option, selectedValues) {
        return function () {
            toggleSelection(option, selectedValues);
        };
    }

    function toggleSelection(option, selectedValues) {
        let newSelection;

        if (isSelected(option, selectedValues)) {

            if (multiple) {
                newSelection = selectedValues.filter((value) => value !== option.value);
            } else {
                newSelection = [];
            }

        } else {

            if (multiple) {
                newSelection = selectedValues.concat([option.value]);
            } else {
                newSelection = [option.value];
            }
        }

        onSelectionChange(newSelection);
    }
}

Select.propTypes = {
    options$: PropTypes.instanceOf(Observable),
    selectedValues$: PropTypes.instanceOf(Observable),
    multiple: PropTypes.bool,
    onSelectionChange: PropTypes.func
};


