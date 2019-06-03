import * as React from "react";
import { Square } from "./Square";
import { IBoard, RANKS, FILES, SQID, PID, DIRECTION, DIRECTION_GROUP, DIRECTION_GROUPS, CARDINALS, ORDINALS, HALF_WINDS, } from "./Model";
import { Piece } from "./Piece";
import { Game } from "./Game";
import { King } from "./King";

export class Board extends React.Component<IBoard, {}> {
  static SELECTED: string = null;

	static getDirectionGroup(direction: DIRECTION): DIRECTION_GROUP {
		for (let dgroup of DIRECTION_GROUPS) {
			let dArray: DIRECTION[] = (dgroup === DIRECTION_GROUP.CARDINAL)
				? CARDINALS
				: (dgroup === DIRECTION_GROUP.ORDINAL)
					? ORDINALS
					: HALF_WINDS;
			for (let dir of dArray) {
				if (direction === dir) {
					return dgroup;
				}
			}
		}
		return null;
	}

	static nextSquare(drctn: DIRECTION, sqid: SQID): SQID {
		if (sqid){
			let
        [sf, sr] = sqid,
				// coords: [number, number] = [FILES.indexOf(sqid[0]), RANKS.indexOf(sqid[1])],
        coords: [number, number] = [FILES.indexOf(sf), RANKS.indexOf(sr)],
				[f, r] = coords;
			switch (drctn) {
				case DIRECTION.N:   coords = [f,      r += 1]; break;
				case DIRECTION.NNE: coords = [f += 1, r += 2]; break;
				case DIRECTION.NE:  coords = [f += 1, r += 1]; break;
				case DIRECTION.ENE: coords = [f += 2, r += 1]; break;
				case DIRECTION.E:   coords = [f += 1, r];      break;
				case DIRECTION.ESE: coords = [f += 2, r -= 1]; break;
				case DIRECTION.SE:  coords = [f += 1, r -= 1]; break;
				case DIRECTION.SSE: coords = [f += 1, r -= 2]; break;
				case DIRECTION.S:   coords = [f,      r -= 1]; break;
				case DIRECTION.SSW: coords = [f -= 1, r -= 2]; break;
				case DIRECTION.SW:  coords = [f -= 1, r -= 1]; break;
				case DIRECTION.WSW: coords = [f -= 2, r -= 1]; break;
				case DIRECTION.W:   coords = [f -= 1, r];      break;
				case DIRECTION.WNW: coords = [f -= 2, r += 1]; break;
				case DIRECTION.NW:  coords = [f -= 1, r += 1]; break;
				case DIRECTION.NNW: coords = [f -= 1, r += 2]; break;
			}
			if (!(f < 0 || f > 7 || r < 0 || r > 7)) {
				return FILES[f] + RANKS[r] as SQID;
			}
		}
		return null;
	}

	static getDirection(fromsqid: SQID, tosqid: SQID): DIRECTION {
		const
			[ fromfile, fromrank ] = fromsqid,
			[ tofile, torank] = tosqid,
			ifr = RANKS.indexOf(fromrank),
			itr = RANKS.indexOf(torank),
			iff = FILES.indexOf(fromfile),
			itf = FILES.indexOf(tofile);

		let dg: DIRECTION = null;

		if (fromrank === torank) {
			dg = (iff > itf) ? DIRECTION.W : DIRECTION.E;
		} else if (fromfile === tofile){
			dg = (ifr > itr) ? DIRECTION.S : DIRECTION.N;
		} else if (Math.abs((ifr - itr)) === Math.abs((iff - itf))) {
			dg = (iff > itf)
						? (ifr > itr) ? DIRECTION.SW : DIRECTION.NW
						: (ifr > itr) ? DIRECTION.SE : DIRECTION.NE;
		} else if ((Math.abs(iff - itf) + Math.abs(ifr - itr)) === 3){
			dg = (iff > itf)
							? (ifr > itr)
								? ((ifr - itr) === 1) ? DIRECTION.WSW : DIRECTION.SSW
								: ((itr - ifr) === 1) ? DIRECTION.WNW : DIRECTION.NNW
							: (ifr > itr)
								? ((ifr - itr) === 1) ? DIRECTION.ESE : DIRECTION.SSE
								: ((itr - ifr) === 1) ? DIRECTION.ENE : DIRECTION.NNE;
		}
		return dg;
	}
  static betweenSquares (from: SQID, to: SQID): SQID[] {
    const
      drctn = Board.getDirection(from, to);
    let
      betweens: SQID[] = [],
      sq: SQID = from;
    while (sq = Board.nextSquare(drctn, sq)) {
      if (sq === to) break;
      betweens.push(sq);
    }
    return betweens;
  }
	static intercepts (interceptor: SQID, from: SQID, to: SQID): boolean {
		let
			result = false,
			sq: SQID = from;
		const drctn = Board.getDirection(from, to);
		do {
			if (interceptor === sq) {
				result = true;
				break;
			}
			sq = Board.nextSquare(drctn, sq);
		} while (!(sq === to));

		return result;
	}

	static alignedWith (from: SQID, drctn: DIRECTION): Piece {
		// return the first piece encountered or null ?
		let
			piece: Piece = null,
			sq: SQID = from;

		do {
			sq = Board.nextSquare(drctn, sq);
			if (sq === null) {
				break; // past edge of board
			} else {
				piece = Game.control.getPiece(sq);
				if (HALF_WINDS.includes(drctn)){
					break;
				}
				if (piece instanceof King){
					// King too far even without checking because King cannot be next to other king
					break;
				}
			}
		} while ( !piece );
		return piece;
	}

	handleSquareSelection = (position: SQID): void => {
		this.props.onSquareSelection(position);
	}

	render(){
		const
			jsxElms: JSX.Element[] = [],
			squaresToPieces = this.props.squaresToPieces,
			selectedSquare: SQID = this.props.selectedSquare,
			orientation = this.props.orientation,
      moves = this.props.moves,
      nMoves = this.props.moves.length,
      lastMove = nMoves ? moves[nMoves - 1] : '',
      stalemate = lastMove.endsWith('='),
			checking = this.props.checking,
			chkingpiece = (checking.length === 0) ? null : squaresToPieces[checking[0]],
			attacking = this.props.attacking,
			attacked = this.props.attacked,
			defending = this.props.defending,
			defended = this.props.defended,
			kpid= ((chkingpiece)
								? (chkingpiece[0] === 'W') ? 'BK' : 'WK'
								: null) as PID;

		for (let rank = (orientation === 'W') ? RANKS.length - 1: 0;
		     (orientation === 'W') ? rank >= 0 : rank < RANKS.length;
		     (orientation === 'W') ? rank -= 1 : rank += 1){
			for (let file = (orientation === 'W') ? 0 : FILES.length - 1;
			     (orientation === 'W') ? file < FILES.length :  file >= 0;
			     (orientation === 'W') ? file += 1 : file -= 1){

				const
					sqid: SQID = (FILES[file] + RANKS[rank]) as SQID,
					pid: PID = this.props.squaresToPieces[sqid],
					selected = (selectedSquare && selectedSquare === sqid),
					legal = this.props.legals.includes(sqid),
					attckng = attacking.includes(sqid),
					attckd = attacked.includes(sqid),
					dfndng = defending.includes(sqid),
					dfndd = defended.includes(sqid);

				jsxElms.push(
					<Square
						key={ sqid }
						sqid={ sqid }
						pid={ pid }
            stalemate={ stalemate }
						checked={ (chkingpiece && (kpid === pid)) }
						selected={ selected }
						attacking={ attckng }
						attacked={ attckd }
						defending={ dfndng }
						defended={ dfndd }
						onSelection={ this.handleSquareSelection.bind(this) }
						legals={ legal } />
					);
			}
		}

    return <div className="board">{ jsxElms }</div>;
  }
}




// WEBPACK FOOTER //
// ./src/components/Board.tsx
