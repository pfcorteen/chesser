import * as React from "react";
import { ISquare, PIECE_ICONS, RANKS, FILES, IS_KING } from "./Model";

export class Square extends React.Component<ISquare, {}> {
	handleClick = (): void => {
		const
			pelms = document.getElementsByClassName('promotion'),
			pelm = pelms[0];
		if ((pelm as HTMLElement).style.display === 'none'){
			this.props.onSelection(this.props.sqid);
		}
	};
  render(){
  	const
		  sqid = this.props.sqid,
		  f = FILES.indexOf(sqid[0]),
		  r = RANKS.indexOf(sqid[1]),
			pid = this.props.pid,
			stalemate = this.props.stalemate && IS_KING.test(pid) ? ' stalemate' : '',
		  checked = (this.props.checked) ? ' checked' : '',
		  selected = this.props.selected ? ' selected' : '',
		  legalPosition = this.props.legals ? ' legal' : '',
		  attacking = this.props.attacking ? ' attacking' : '',
		  attacked = this.props.attacked ? ' attacked' : '',
		  defending = this.props.defending ? ' defending' : '',
		  defended = this.props.defended ? ' defended' : '',
	    className='board_square',
		  squareColour = className + ((r % 2)
																  ? (f % 2) ? '-dark' : '-light'
																  : (f % 2) ? '-light' : '-dark'),
		  p = (pid) ? pid[0] + pid[pid.length - 1] : null,
	    jsx: JSX.Element = (pid) ? <span className={ 'board_piece' }>{ PIECE_ICONS[p] }</span> : null;

    return (
    	<div id={sqid} className={ className + ' ' + squareColour + selected + legalPosition + stalemate
          + checked + attacking + attacked + defending + defended }
	         onClick={ this.handleClick.bind(this) }>
	      { jsx }
			</div>
    );
  }
}
