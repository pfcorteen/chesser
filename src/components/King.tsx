import {Piece} from "./Piece";
import {Rook} from "./Rook";
import {SQID, PID, CARDINALS, ORDINALS, FILES, RANKS, IS_KING } from "./Model";
import {Game} from "./Game";
import {Board} from "./Board";

export class King extends Piece {

	moved: boolean = false;

	auxiliaryAction = (): void => {
		!(this.moved) && (this.moved = true);
	}

	alignedWith = (sqid: SQID): boolean => {
		const
			drctn = Board.getDirection(this.sqid, sqid),
			ff = FILES.indexOf(sqid[0]),
			tf = FILES.indexOf(this.sqid[0]),
			fr = RANKS.indexOf(sqid[1]),
			tr = RANKS.indexOf(this.sqid[1]);
		return ((this.directions.includes(drctn)) &&
			(((Math.abs(fr - tr)) === 1) || ((Math.abs(ff - tf)) === 1)));
	}

	constructor(sqid: SQID, pid: PID) {
		super(sqid, pid);
		this.directions = [...CARDINALS, ...ORDINALS];
		this.step = true;
		if ((pid[0] === 'W' && sqid !== 'e1') || (pid[0] === 'B' && sqid !== 'e8')) {
			this.moved = true;
		}
	}
	public markPins = (): void => {
		const control = Game.control;
		for (const drctn of this.directions) {
			let
				sqid = this.sqid, // this is a King!
				pinnedPiece: Piece = null,
				checkPin = false;
			while(sqid = Board.nextSquare(drctn, sqid)) {
				let pid: PID = null;
				if ((pid = control.getPid(sqid)) && !(IS_KING.test(pid))) {
					const piece = control.getPiece(pid);
					if (piece.getSide() === this.getSide()) {
						pinnedPiece = piece;
						if (checkPin) { break; }
						checkPin = true;
					} else {
						if (checkPin) {
							piece.directions.includes(drctn)
								? pinnedPiece.setKPin(pid)
								: pinnedPiece.setKPin(null);
						}
						break;
					}
				}
			}
		}
	}
	public markShadows = (): void => {
		const control = Game.control;
		for (const drctn of this.directions) {
			let
				sqid = this.sqid, // this is a King!
				shadowedPiece: Piece = null,
				checkShadow = false;
			while(sqid = Board.nextSquare(drctn, sqid)) {
				let pid: PID = null;
				if ((pid = control.getPid(sqid)) && !(IS_KING.test(pid))) {
					const
						piece = control.getPiece(pid),
						ds = piece.directions;
					if (piece.getSide() !== this.getSide() && !ds.includes(drctn)) {
						shadowedPiece = piece;
						if (checkShadow) { break; }
						checkShadow = true;
					} else if (piece.getSide() !== this.getSide()) {
						if (checkShadow) {
							piece.directions.includes(drctn)
								? shadowedPiece.setKShadow(pid)
								: shadowedPiece.setKShadow(null);
						}
						break;
					}
				}
			}
		}
	}
	protected castling(): SQID[] {
		const
			gc = Game.control,
			side = this.pid[0],
			rpids: PID[] = [side + 'KR', side + 'QR'];

		let castlingSquares: SQID[] = [];
		if (!this.moved && !this.attckrs.length) { // king can't castle out of check
			rpids.forEach((rpid) => {
				const
					rook: Rook = gc.getPiece(rpid) as Rook;
				if (rook && !rook.moved && rook.getDfndng().includes(side + 'K')) {
					const
						side = rook.getSide(),
						sq = (side === 'W')
							? (rpid[1] === 'K') ? 'g1' : 'c1'
							: (rpid[1] === 'K') ? 'g8' : 'c8';
					castlingSquares.push(sq);
				}
			});
		}
		return castlingSquares;
	}
	protected findLegalPositions() {
		const
			control = Game.control,
			oppside = (this.getSide() === 'W') ? 'B' : 'W',
			castleSquares = this.castling();

		if (castleSquares.length) {
			this.potentials.push(...castleSquares);
		}

		for (const sqid of this.potentials) {
			const
				adjacentPiece = control.getPiece(sqid), // NB: opposite side cos same side pieces not included in potentials
				dfndrs = adjacentPiece ? adjacentPiece.getDfndrs() : [];

			// let ds = dfndrs.filter((pid, idx) => {
			// 	const piece = control.getPiece(pid);
			// 	return !piece.isPinned(sqid);
			// });
			//
			// if (adjacentPiece && ds.length) {
			// 	continue;
			// } else
			if (control.checkedBy(sqid, oppside).length === 0) {
				this.legals.push(sqid);
			}
		}
	}
}
