import {HALF_WINDS, SQID, PID, FILES, RANKS } from "./Model";
import {Piece} from "./Piece";
import {Game} from "./Game";
import {Board} from "./Board";

export class Knight extends Piece {

	public alignedWith = (sqid: SQID): boolean => {
		const
			drctn = Board.getDirection(this.sqid, sqid),
			ff = FILES.indexOf(sqid[0]),
			tf = FILES.indexOf(this.sqid[0]),
			fr = RANKS.indexOf(sqid[1]),
			tr = RANKS.indexOf(this.sqid[1]);
		return ((this.directions.includes(drctn)) &&
			(((Math.abs(ff - tf) + Math.abs(fr - tr)) === 3)));
	}
	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = HALF_WINDS;
		this.step = true;
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
	// //TODO - no point in checking every sqid if the piece is pinned
     //      for (const sqid of this.potentials) {
     //           if (pnnngSqid) {
     //                // if (!Board.intercepts(sqid, pnnngSqid, ksqid)) {
     //                     continue;
     //                // }
     //           }
     //           this.legals.push(sqid);
     //      }
     // }
}
