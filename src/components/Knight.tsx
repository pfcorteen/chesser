import {HALF_WINDS, SQID, PID, FILES, RANKS } from "./Model";
import {Piece} from "./Piece";
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

	protected findLegalPositions() {
		this.legals = this.potentials;
	}
}
