
import React from "react";
import PropTypes from "prop-types";
import $ from "jquery";

export default Tooltip;

function Tooltip({text, onKeyDown, children}) {

	return (
		<span
            tabIndex="-1"
			data-toggle="tooltip"
			title={text}
			onKeyDown={onKeyDown}
			ref={(element) => $(element).tooltip()}
		>{children}</span>
	);

}

Tooltip.propTypes = {
    text: PropTypes.string,
    onKeyDown: PropTypes.func,
	children: PropTypes.any
};
