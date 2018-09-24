
import React from "react";
import PropTypes from "prop-types";
import "./HelpIcon.styles.scss";

import Tooltip from "./Tooltip.component";

export default HelpIcon;

function HelpIcon({text}) {

	return (
		<Tooltip text={text}>
			<span className="lv-help-icon text-light bg-secondary">?</span>
		</Tooltip>
	);

}

HelpIcon.propTypes = {
    text: PropTypes.string
};
