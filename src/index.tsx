import * as React from "react";
import * as ReactDOM from "react-dom";
import { Game } from "./components/Game";
import { ITest, IScoredMove, BasicPieceRank } from "./components/Model";
import * as jsontests from "./tests.json";

let redraw = () => {
	const
		h = window.innerHeight,
		w = window.innerWidth,
		dim = (w > h) ? h : w,
		squareDim = dim / 11,
		squareSide = squareDim + 4,
		boardSide = Math.ceil(8 * squareSide), // use ceil otherwise overflows
		captureSquareDim = dim / 23,
		promoSquareDim = dim / 9,
		styles =
			`.board{ font: ${squareDim}px Arial Unicode MS, sans-serif;
							 width: ${boardSide}px; height: ${boardSide}px}
			 .board_square { width: ${squareDim}px; height: ${squareDim}px}
			 #captures, #configControls {font: ${captureSquareDim}px Arial Unicode MS, sans-serif;
							    width: ${boardSide}px; height: ${squareSide}px}
			 .config {font: ${captureSquareDim / 3}px Arial Unicode MS, sans-serif; }
			 .promotion{ font: ${promoSquareDim}px Arial Unicode MS, sans-serif; }
			 .promo_square { width: ${promoSquareDim}px; height: ${promoSquareDim}px}`,
		stylEl = document.createElement('style');

	stylEl.setAttribute('type', 'text/css');
	stylEl.innerHTML = styles;
	document.head.appendChild(stylEl);
};

document.body.onload = redraw;
window.onresize = redraw;


const tests: ITest[] = jsontests['default'];
(function runTests (doTests = true): void {
	let testIdx = 0;
	if (tests.length) {
		(function handleTestCompleted() {
			const test = (tests.length > testIdx) ? tests[testIdx] : null;
			ReactDOM.render(
				<Game test={doTests ? test : null} onTestCompleted={handleTestCompleted} onRunTests={runTests} />,
				document.getElementById('game')
			);
			testIdx += 1;
		})();
	}
})(false);

// const
// 	tests: ITest[] = jsontests['default'],
// 	runTests = (doTests = true): void => {
// 		let testIdx = 0;
// 		if (tests.length) {
// 			(function handleTestCompleted() {
// 				const test = (tests.length > testIdx) ? tests[testIdx] : null;
// 				ReactDOM.render(
// 					<Game test={doTests ? test : null} onTestCompleted={handleTestCompleted} onRunTests={runTests} />,
// 					document.getElementById('game')
// 				);
// 				testIdx += 1;
// 			})();
// 		}
// 	};
//
// runTests(false);
