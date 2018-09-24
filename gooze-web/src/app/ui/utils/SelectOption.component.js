
import React from "react";
import PropTypes from "prop-types";
import {ensure} from "utils";

export default SelectOption;

function SelectOption({title, isSelected}) {

    isSelected = ensure.boolean(isSelected);

    return (
        <div className={"lv-select-option " + (isSelected ? "selected" : "")}>
            <div className="title">{title}</div>
        </div>
    );

}

SelectOption.propTypes = {
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    isSelected: PropTypes.bool
};