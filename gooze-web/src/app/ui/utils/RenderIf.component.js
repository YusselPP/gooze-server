import React from "react";
import PropTypes from "prop-types"
import {reactive} from "utils";
import {Observable} from "rxjs/Observable";

export default RenderIf;

const ReactiveFragment = reactive(React.Fragment);

function RenderIf({condition$, children}) {
	return (
		<ReactiveFragment>
			{
				condition$.distinctUntilChanged().map( (condition) => (
					condition
						? (
							<React.Fragment>{children}</React.Fragment>
						)
						: <div/>
				))
			}
		</ReactiveFragment>
	);
}

RenderIf.propTypes = {
	condition$: PropTypes.instanceOf(Observable).isRequired,
	children: PropTypes.any.isRequired
};