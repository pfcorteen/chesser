import {CARDINALS, ORDINALS, SQID, PID } from "./Model";
import {Piece} from "./Piece";
import {Game} from "./Game";
import {Board} from "./Board";

export class Queen extends Piece {

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = [...CARDINALS, ...ORDINALS];
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
