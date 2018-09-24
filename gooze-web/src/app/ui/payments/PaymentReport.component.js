/**
 * Created by yparedes on 9/20/18.
 */
import React from "react";
import {Observable} from "rxjs/Observable";
import PropTypes from "prop-types";
import moment from "moment";

import {rxDom} from "utils/reactiveDom";
import {dispatch, state$} from "../../state/app.store";
import {fetchPayments} from "../../state/payment/report/report.actions";

const displayStatus = (status) => {
    let displayName;
    switch (status) {
        case 'pending': displayName = 'Pendiente';
            break;
    }
    return displayName;
};

export default PaymentReport;

function PaymentReport() {

    const paymentResults$ = state$.pluck("payment", "report", "results").distinctUntilChanged();

	const filteredPayments$ = (
        paymentResults$.pluck("payments")
            .map((payments) => (
                payments.map((payment, i) => (
                        <tr key={i}>
                            {/*<td>{payment.id}</td>*/}
                            <td title={payment.id}>{payment.toUser && payment.toUser.username}</td>
                            <td>{moment(payment.createdAt).format("YYYY-MM-DD hh:mm:ss")}</td>
                            <td>{payment.amount}</td>
                            <td>{displayStatus(payment.goozeStatus)}</td>
                        </tr>
                    )
                )
            ))
    );

	dispatch(fetchPayments());

	return (
	    <div className="col-12">
            <div className="row">
                <h3>Pagos</h3>
                <hr/>
            </div>
            <div className="row">
                <table className="table">
                    <thead>
                    <tr>
                        {/*<th scope="col">Id</th>*/}
                        <th scope="col">Usuario</th>
                        <th scope="col">Fecha</th>
                        <th scope="col">Cantidad</th>
                        <th scope="col">Status</th>
                    </tr>
                    </thead>
                    <rxDom.tbody>{
                        filteredPayments$
                    }</rxDom.tbody>
                </table>
            </div>
        </div>
	);

}

