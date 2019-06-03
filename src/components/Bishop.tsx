import { ORDINALS, PID, SQID } from "./Model";
import {Piece} from "./Piece";

export class Bishop extends Piece {

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = ORDINALS;
	}

	protected findLegalPositions() {
		this.legals = this.potentials;
	}
}
