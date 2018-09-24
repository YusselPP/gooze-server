import React from "react";
import MainView from "./ui/MainView.component";
import {rootClick$} from "./ui/utils/rootClick.service";
import "./App.styles.scss";

export default App;

function App() {
	return (
		<div onClick={(event) => rootClick$.next(event)}>
            <MainView/>
		</div>
	);
}
