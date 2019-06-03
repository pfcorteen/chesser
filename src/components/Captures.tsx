import * as React from "react";
import { IPiecePids, PIECE_ICONS } from "./Model";

export class Captures extends React.Component<IPiecePids, {}> {

	render() {
		const pieces = this.props.pieces;
		let jsxs: JSX.Element[] = [];

		pieces.forEach(captured => {
			const piece = captured[0] + captured[captured.length - 1];
			jsxs.push(
				<span key={ captured } className={ 'capture_piece' }>{ PIECE_ICONS[piece] }</span>
			)
		});

		return (
			<div id={ 'captures' }>
				{ jsxs }
      </div>
		);
  }
}
