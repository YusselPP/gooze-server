
import React from "react";
import {rxDom} from "utils/reactiveDom";
import {state$} from "app/state/app.store";
import {dismissToast} from "./ToastAlerts.service";
import "./Toast.styles.scss";
import {SEVERITY_TYPES} from "utils";

export default Toast;

const levelMap = {
	[SEVERITY_TYPES.DEBUG]: "alert alert-secondary",
	[SEVERITY_TYPES.INFO]: "alert alert-info",
	[SEVERITY_TYPES.LOG]: "alert alert-primary",
	[SEVERITY_TYPES.WARNING]: "alert alert-warning",
	[SEVERITY_TYPES.ERROR]: "alert alert-danger",
	[SEVERITY_TYPES.SUCCESS]:"alert alert-success"

};

function Toast() {
	const alerts$ = state$.pluck("toastAlerts");

	return (
		<rxDom.div className="toast-component">{
			alerts$
				.map((alerts) => alerts.map((alert,index) =>
					<div key={alert.id} className="toast-element" style={{top: index*60 + "px"}}>
						<div className={levelMap[alert.level] || "alert alert-secondary"}>
							{alert.body}
							<button type="button" className="close" onClick={ (event) => dismissAlert({event, alert}) }>
								<span>&times;</span>
							</button>
						</div>
					</div>
				))
		}</rxDom.div>
	);

	function dismissAlert({alert}){
		dismissToast(alert.id);
	}
}
