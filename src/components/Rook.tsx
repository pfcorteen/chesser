import {CARDINALS, SQID, PID  } from "./Model";
import {Piece} from "./Piece";
import {Game} from "./Game";
import {Board} from "./Board";

export class Rook extends Piece {

	public moved: boolean = false;
	public auxiliaryAction = (): void => {
		this.kpin = null;
		!(this.moved) && (this.moved = true);
	}

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = CARDINALS;
		const
			side = pid[0],
			pieceIndicator = pid[1];

		if ((side === 'W') && (((pieceIndicator === 'K') && (sqid !== 'h1')) || (pieceIndicator === 'Q') && (sqid !== 'a1'))) {
			this.moved = true;
		} else if ((side === 'B') && (((pieceIndicator === 'K') && (sqid !== 'h8')) || (pieceIndicator === 'Q') && (sqid !== 'a8'))) {
			this.moved = true;
		}
	}

	protected findLegalPositions() { this.legals = this.potentials; }

	// protected findLegalPositions() {
     //      const
     //           control = Game.control,
     //           pnnngPiece = control.getPiece(this.kpin),
     //           pnnngSqid = pnnngPiece ? pnnngPiece.getSqid() : null,
     //           oppSide = this.getSide() === 'W' ? 'B' : 'W',
     //           ksqid = control.getPiece(oppSide + 'K'). getSqid();
	//
     //      for (const sqid of this.potentials) {
     //           if (pnnngSqid) {
     //                if (!Board.intercepts(sqid, pnnngSqid, ksqid)) {
     //                     continue;
     //                }
     //           }
     //           this.legals.push(sqid);
     //      }
     // }
}
