
import React from "react";
import {rxDom} from "utils/reactiveDom";

import ReactiveFragment from "./ReactiveFragment.component";
import {modalContent$, initModal} from "./Modal.service";

import "./Modal.styles.scss";

export default Modal;

function Modal() {

    const title$ = modalContent$.pluck("title");
    const body$ = modalContent$.pluck("body");
    const closeText$ = modalContent$.pluck("closeText");
    const actions$ = modalContent$.pluck("actions");

    return (
        <div className="modal fade" id="lv-modal" tabIndex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" ref={() => initModal()}>
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <rxDom.h5 className="modal-title">{
                            title$
                        }</rxDom.h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <rxDom.div className="modal-body">{
                        body$
                    }</rxDom.div>
                    <div className="modal-footer">
                        <rxDom.button type="button" className="btn btn-default" data-dismiss="modal">{
                            closeText$
                        }</rxDom.button>
                        <ReactiveFragment>{
                            actions$
                        }</ReactiveFragment>
                    </div>
                </div>
            </div>
        </div>
    );

}
