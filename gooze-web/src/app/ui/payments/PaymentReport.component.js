/**
 * Created by yparedes on 9/20/18.
 */
import React from "react";
import {Observable} from "rxjs/Observable";
import PropTypes from "prop-types";
import moment from "moment";

import {rxDom} from "utils/reactiveDom";
import {dispatch, state$} from "../../state/app.store";
import {
  fetchPayments,
  setFilterStatus,
  setFilterFromDate,
  setFilterToDate
} from "../../state/payment/report/report.actions";

const displayStatus = (status) => {
    let displayName;
    switch (status) {
        case "pending": displayName = "Pendiente";
            break;
        case "paid": displayName = "Pagado";
          break;
        case "review": displayName = "Reclamación";
          break;
        default:
          displayName = "";
    }
    return displayName;
};

export default PaymentReport;

function PaymentReport() {

  const paymentParameters$ = state$.pluck("payment", "report", "parameters").distinctUntilChanged();
  const parameterStatus$ = paymentParameters$.pluck("status");
  const parameterFromDate$ = paymentParameters$.pluck("fromDate");
  const parameterToDate$ = paymentParameters$.pluck("toDate");
  const paymentResults$ = state$.pluck("payment", "report", "results").distinctUntilChanged();
  const payments$ = (
    paymentResults$.pluck("payments")
      .map((groupedPayments) => (
        Object.keys(groupedPayments)
          .map((key) => (
            groupedPayments[key]
          ))
        )
      )
  );

  const filteredPayments$ = (
      payments$
          .map((groupedPayments) => (
              groupedPayments.reduce((result, paymentGroup, i) => {
                  const {payments, grossAmount, netAmount} = paymentGroup;

                  result = [...result, ...(payments.map((payment) => (
                      <tr key={payment.id}>
                          <td title={payment.id}>{payment.username}</td>
                          <td>{payment.paypalEmail}</td>
                          <td>{moment(payment.createdAt).format("YYYY-MM-DD hh:mm:ss")}</td>
                          <td>{displayStatus(payment.goozeStatus)}</td>
                          <td>${payment.grossAmount.toFixed(2)}</td>
                          <td>${payment.netAmount.toFixed(2)}</td>
                          <td>
                            <div className="input-group">
                              <input type="text" className="form-control" defaultValue={payment.netAmount.toFixed(2)}/>
                              <div className="input-group-append">
                                <button className="btn btn-outline-secondary">Pagar</button>
                              </div>
                            </div>
                          </td>
                      </tr>
                  )))];

                  result.push(
                      <tr key={i}>
                          <td colSpan="4" className="text-right"><b>Subtotal:</b></td>
                          <td><b>${grossAmount.toFixed(2)}</b></td>
                          <td><b>${netAmount.toFixed(2)}</b></td>
                          <td>&nbsp;</td>
                      </tr>
                  );

                  return result;
              }, [])
      ))
  );

  const totalAmount$ = (
    payments$
      .map((groupedPayments) => (
        groupedPayments.reduce((result, paymentGroup) => [...result, ...paymentGroup.payments], [])
      ))
      .map((payments) => (
        "$" + payments.reduce((prev, payment) => prev + payment.grossAmount, 0).toFixed(2)
      ))
  );

  const totalToPay$ = (
    payments$
      .map((groupedPayments) => (
        groupedPayments.reduce((result, paymentGroup) => [...result, ...paymentGroup.payments], [])
      ))
      .map((payments) => (
        "$" + payments.reduce((prev, payment) => prev + payment.netAmount, 0).toFixed(2)
      ))
  );

  const statusOptions$ = Observable.of([
    "",
    "pending",
    "paid",
    "review",
  ]).map((statuses) =>
      statuses.map((status) =>
        <option key={status} value={status}>{displayStatus(status)}</option>
      )
  );

	dispatch(fetchPayments());

	return (
      <div className="col-12">
          <div className="row">
              <h3>Pagos</h3>
          </div>

          <div className="row justify-content-end">

              <div className="">
                  <div className="form form-inline mb-3">

                      <div className="form-group">
                          <label className="">Status:</label>
                          <rxDom.select className="form-control form-control-sm mx-sm-3" value={parameterStatus$} onChange={handleStatusChange}>{
                              statusOptions$
                          }</rxDom.select>

                          <label className="">Desde:</label>
                          <rxDom.input type="date" className="form-control form-control-sm mx-sm-3" onChange={handleFromDateChange} value={parameterFromDate$}/>

                          <label className="">Hasta:</label>
                          <rxDom.input type="date" className="form-control form-control-sm mx-sm-3" onChange={handleToDateChange} value={parameterToDate$}/>
                      </div>

                  </div>
              </div>

          </div>

          <div className="row justify-content-end mb-3">

              <div className="mr-5">
                Total recibido: <rxDom.span>{totalAmount$}</rxDom.span>
              </div>

              <div className="mr-3">
                Total a pagar: <rxDom.span>{totalToPay$}</rxDom.span>
              </div>
          </div>

          <div className="row">
              <table className="table">
                  <thead>
                  <tr>
                      {/*<th scope="col">Id</th>*/}
                      <th scope="col">Usuario</th>
                      <th scope="col">PayPal Email</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Status</th>
                      <th scope="col">Cantidad recibida</th>
                      <th scope="col">Cantidad a pagar</th>
                      <th>&nbsp;</th>
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

function handleStatusChange(event) {
  const status = event.target.value;
  dispatch(setFilterStatus({status}));
}

function handleFromDateChange(event) {
  const fromDate = event.target.value;
  dispatch(setFilterFromDate({fromDate}));
}

function handleToDateChange(event) {
  const toDate = event.target.value;
  dispatch(setFilterToDate({toDate}));
}

