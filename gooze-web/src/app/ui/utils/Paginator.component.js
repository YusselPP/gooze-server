
import React from "react";
import {Observable} from "rxjs/Observable";
import {combineLatest} from "rxjs/observable/combineLatest";
import PropTypes from "prop-types";

import {ensure, rxDom} from "utils";

import "./Paginator.styles.scss";

export default Paginator

function Paginator({model$, onPreviousClick, onPageChange, onNextClick}) {

    onPreviousClick = ensure.function(onPreviousClick);
    onPageChange = ensure.function(onPageChange);
    onNextClick = ensure.function(onNextClick);

    const maxPages$ = model$.pluck("maxPages");
    const currentPage$ = model$.pluck("currentPage");
    const disablePrev$ = currentPage$.map((currentPage) => currentPage <= 0);
    const disableNext$ = (
        combineLatest(currentPage$, maxPages$)
            .map(([currentPage, maxPages]) => currentPage >= maxPages - 1)
    );

    return (
        <div className="lv-paginator d-flex justify-content-center">

            {/* <div className="p-1"><a className="page-link" href="#">&lt;&lt;</a></div> */}

            <rxDom.div className={disablePrev$.map((disablePrev) => `p-1 page-item ${disablePrev ? "disabled" : ""}`)}>
                <div className="page-link" onClick={onPreviousClick}>&lt;</div>
            </rxDom.div>


            <div className="py-1 pl-1">
                <rxDom.input type="number"
                             className="form-control page-input"
                             value={currentPage$.map((val) => val + 1)}
                             onChange={(event) => onPageChange(event.target.value - 1)}
                             onFocus={(event) => event.target.select()}
                />
            </div>

            <div className="py-1 pr-1">
                <div className="page-link total-pages">/ <rxDom.span>{maxPages$}</rxDom.span></div>
            </div>

            <rxDom.div className={disableNext$.map((disablePrev) => `p-1 page-item ${disablePrev ? "disabled" : ""}`)}>
                <div className="page-link" onClick={onNextClick}>&gt;</div>
            </rxDom.div>

            {/* <div className="p-1"><a className="page-link" href="#">&gt;&gt;</a></div> */}
        </div>
    );
}

Paginator.propTypes = {
    model$: PropTypes.instanceOf(Observable),
    onPreviousClick: PropTypes.func,
    onPageChange: PropTypes.func,
    onNextClick: PropTypes.func,
};
