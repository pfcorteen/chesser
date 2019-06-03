import {CARDINALS, SQID, PID  } from "./Model";
import {Piece} from "./Piece";

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

	protected findLegalPositions() {
		this.legals = this.potentials;
	}
}
