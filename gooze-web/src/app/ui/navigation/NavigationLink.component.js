import React from "react";
import PropTypes from "prop-types";
import router from "app/app.router";

export default NavigationLink;

function NavigationLink({route, parameters = {}, children, className}) {

	return (
		<a href="" onClick={handleClick} className={className}>{children}</a>
	);

	function handleClick(event) {
		event.preventDefault();
		router.navigate(route, parameters);
	}
}

NavigationLink.propTypes = {
	route: PropTypes.string.isRequired,
	children: PropTypes.any,
	parameters: PropTypes.object,
	className: PropTypes.string
};