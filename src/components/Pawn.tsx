import {SIDE, SQID, PID, DIRECTION, RANKS, ORDINALS } from "./Model";
import {Piece} from "./Piece";
import {Board} from "./Board";
import {Game} from "./Game";
import {GameControl} from "./GameControl";

export class Pawn extends Piece {

	public static directions = (side: SIDE): DIRECTION[] => {
		return (side === 'W') ? [DIRECTION.NE, DIRECTION.N, DIRECTION.NW] : [DIRECTION.SE, DIRECTION.S, DIRECTION.SW];
	};

	public moved = false;

	public auxiliaryAction = (sqid: SQID, control: GameControl | null): void => {
		control = control || Game.control;
		this.kpin = null;

		const rank = sqid[1];

		if (!this.moved) {
			if (rank === ((this.getSide() === 'W') ? '4' : '5')) {
				// check whether this pawn can now be taken enpassant
				// - position of capturing pawn will be same rank + or - 1 file
				const
					eastSqid: SQID = Board.nextSquare(DIRECTION.E, sqid),
					westSqid: SQID = Board.nextSquare(DIRECTION.W, sqid),
					eastPid: PID = control.getPid(eastSqid),
					westPid: PID = control.getPid(westSqid),
					side = (this.getSide() === 'W') ? 'B' : 'W',
					rgxp = new RegExp('^' + side + '.*' + 'P$');

				if ((eastPid && eastPid.match(rgxp)) || (westPid && westPid.match(rgxp))) {
					control.setEnPassant(sqid);
				}
			}

			this.moved = true;
		}
		else if (rank === ((this.getSide() === 'W') ? '8' : '1')) {
			control.setPromotion(sqid);
		}
	};


	alignedWith = (sqid: SQID): boolean => {
		const
			drctn = Board.getDirection(this.sqid, sqid),
			fr = RANKS.indexOf(sqid[1]),
			tr = RANKS.indexOf(this.sqid[1]);
		return (((Math.abs(fr - tr)) === 1) &&
			(this.directions.includes(drctn)) &&
			(ORDINALS.includes(drctn)));
	}

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = Pawn.directions(this.getSide());
		this.step = true;
		if (((pid[0] === 'W') && (sqid[1] !== '2')) || ((pid[0] === 'B') && (sqid[1] !== '7'))) {
			this.moved = true;
		}
	}

	protected findLegalPositions() {
		const
			gc = Game.control,
			enPassant = gc.getEnPassant();

		for (const sqid of this.potentials) {
			const
				[file, rank] = sqid,
				side: SIDE = this.pid[0] as SIDE,
				ahead = (file === this.sqid[0]),
				cpid: PID = gc.getPid(sqid); // note: own cpids accounted for in Piece.getPotentialSquares

			if (ahead) {
				if (cpid) {
					continue;
				} else {
					if ((rank === '3' && side === 'W') || (rank === '6' && side === 'B')) {
						const extrasqid: SQID = (file + ((side === 'W') ? '4' : '5')) as SQID;
						if (!gc.getPid(extrasqid)) {
							this.legals.push(extrasqid);
							// this.potentials.push(extrasqid);
						}
					}
					this.legals.push(sqid);
				}
			} else { // not ahead
				if (cpid) {
					this.legals.push(sqid);
				} else if (enPassant && (rank === ((Game.nextTurn === 'W') ? '6' : '3'))) {
					const epPawnSqid = (rank === '6')
						? Board.nextSquare(DIRECTION.S, sqid)
						: Board.nextSquare(DIRECTION.N, sqid);

					if (epPawnSqid === enPassant) {
						this.legals.push(sqid);
					}
				}
			}
		}
	}
}
