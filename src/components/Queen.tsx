import {CARDINALS, ORDINALS, SQID, PID } from "./Model";
import {Piece} from "./Piece";

export class Queen extends Piece {

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = [...CARDINALS, ...ORDINALS];
	}

	protected findLegalPositions() {
		this.legals = this.potentials;
	}
}
