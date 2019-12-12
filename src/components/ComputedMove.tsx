import { PID, PID_TO, PID_TO_ONTO, PID_WITH_RANK, SQID, SIDE, } from "./Model";
import { IS_KING, IS_PAWN, IS_KNIGHT, DIRECTION, CARDINALS, ORDINALS, ALL_DIRECTIONS } from "./Model";
import { IScoredMove, IGameMove, IGeneratedMove, BasicPieceRank } from "./Model";
import { Piece } from "./Piece";
import { Game } from "./Game";
import { Board } from "./Board";

export class ComputedMove {

	private static scoredMoveRegister = (): Function => {
		let scoredMoves: number[] = [];
		return function(move: IGeneratedMove, score?: number): number {
			if (move.pid === null) {
				scoredMoves = [];
				return 0;
			}

			const
				moveStr = move.pid + move.to + ((move.ppid) ? move.ppid : ''),
				storedScore = scoredMoves[moveStr];
			if (storedScore !== undefined) {
				return storedScore;
			}

			let fred = scoredMoves[moveStr] = score;
			return score;
		};
	}

	// keep track of which parts of a move have been enacted
	private enactedMove: IGameMove = { pid: null, to: null, ppid: null, result: null };

	// parts of a move thought up by the program
	private computedMove: IGeneratedMove = { pid: null, to: null, ppid: null };
	private dudMove: IGeneratedMove = { pid: null, to: null, ppid: null };

	private moveScorer = ComputedMove.scoredMoveRegister();

	private performComputedMove = (): void => {
		const
			control = Game.control,
			currentPlayer = control.getCurrentPlayer();
		let
			elmnt: HTMLElement = null;

		if (this.computedMove.pid === null) {
			// indicate a draw by clicking on opposite king
			const
				oppkpid = (((currentPlayer === 'W') ? 'B' : 'W') + 'K') as PID,
				oppKing = control.getPiece(oppkpid),
				sqid = oppKing.getSqid();
			elmnt = document.getElementById(sqid);
		} else {
			const
				pid = this.computedMove.pid,
				piece = control.getPiece(pid),
				from = piece.getSqid(),
				to = this.computedMove.to,
				ppid = this.computedMove.ppid,
				side = currentPlayer;

			if (this.enactedMove.pid === null) {
				this.enactedMove.pid = pid;
				elmnt = document.getElementById(from);
			} else if (this.enactedMove.to === null) {
				if (ppid) {
					this.enactedMove.to = to;
				} else {
					this.enactedMove = { pid: null, to: null, ppid: null, result: null };
					this.computedMove = this.enactedMove;
				}
				elmnt = document.getElementById(to);
			} else {
				this.enactedMove = { pid: null, to: null, ppid: null, result: null };
				this.computedMove = this.enactedMove;
				elmnt = document.getElementById(side + 'Q');
			}
		}
		elmnt && elmnt.click();
	}
	compute = (lastMove: string): void => {

		if (!this.enactedMove.pid) {
			if (lastMove) {
				if (lastMove.endsWith('#')) {  // checkmate
					return;
				} else if (lastMove.endsWith('+')) {
					// is not checkmate so can escape
					this.escapeCheck(lastMove);
				}
			}
		}

		const strategies: Function[] = [
			this.deliverMate,
			this.considerCaptures,
			this.kingHunt,
			this.computeBestMove,
		];

		if (this.computedMove.pid === null) {
			let generatedMove: IGeneratedMove = null;
			this.moveScorer(this.dudMove); // set up fresh scoredMoves list

			for (const func of strategies) {
				generatedMove = func(lastMove);
				if (generatedMove) {
					this.computedMove = generatedMove;
					break;
				}
			}
		}
		this.performComputedMove();
	}
	private sortPidsAndRank = (pids: PID[]): [PID, number][] => {
		const sortedPids = this.sortPidsByLowestRank(pids);
		let sortedPidsAndRanks: [PID, number][] = [];
		sortedPids.map(pid => {
			const
				control = Game.control;
			sortedPidsAndRanks.push([pid, control.getPieceWorth(pid)]);
		});
		return sortedPidsAndRanks;
	}
	private sortPidsByLowestRank = (pids: PID[]): PID[] => {
		// Kings always last in exchange
		return pids.sort((apid, bpid) => { // rank by lowest piece value first
			const
				control = Game.control,
				abpr = control.getPieceWorth(apid),
				bbpr = control.getPieceWorth(bpid);
			return abpr - bbpr;
		});
	}
	private rankByLowestScore = (a, b): number => {
		// rank by lowest piece value within highest score first
		const
			control = Game.control,
			apid = a.pid,
			bpid = b.pid,
			abps = a.score + control.getPieceWorth(apid),
			bbps = b.score + control.getPieceWorth(bpid);
		if (a.score === b.score) {
			return abps - bbps;
		}
		return b.score - a.score;
	}
	private rankByHighestScore = (a, b): number => {
		// rank by highest piece value within highest score first
		const
			control = Game.control,
			apid = a.pid,
			bpid = b.pid,
			abps = a.score + control.getPieceWorth(apid),
			bbps = b.score + control.getPieceWorth(bpid);
		if (a.score === b.score) {
			return bbps - abps;
		}
		return a.score - b.score;
	}
	private promo = (pid: PID, to: SQID): PID => {
		let retpid: PID = null;
		if (IS_PAWN.test(pid)) {
			const
				side = pid[0] as SIDE,
				rank = to[1];
			if (rank === '8' || rank === '1') {
				const promPidArray: PID[] = [side + 'Q', side + 'R', side + 'B', side + 'N'];
				let scoredMoves: IScoredMove[] = [];
				for (const promPid of promPidArray) {
					const score = this.squareValueReOccupy([promPid, to], true); // true indicates promoted
					scoredMoves.push({ pid: pid, to: to, ppid: promPid, score: score });
				}
				scoredMoves = scoredMoves.sort(this.rankByHighestScore)
				retpid = scoredMoves[0].ppid;
			}
		}
		return retpid;
	}
	private computeBestMove = (): IGeneratedMove => {
	// console.log(' entered computeBestMove');
		const
			control = Game.control,
			currentPlayer = control.getCurrentPlayer(),
			pids: PID[] = control.getPidArray(currentPlayer),
			allScoredMoves: IScoredMove[] = [];

		for (const pid of pids) {
			const
				piece = control.getPiece(pid),
				legals = piece.getLegals();
			for (const sqid of legals) {
				if (!piece.isPinned(sqid)) {
					const
					 	ppid =  this.promo(pid, sqid),
						score = this.squareValueReOccupy([(ppid ? ppid : pid), sqid]);
					allScoredMoves.push({ pid: pid, to: sqid, ppid: ppid, score: score });
				}
			}
		}

		let generatedMove: IGeneratedMove = null;
		if (allScoredMoves.length) {
			allScoredMoves.sort(this.rankByLowestScore);
			let
				prevScore: number,
				bestMoves = allScoredMoves.filter((move, idx) => {
					if (prevScore === undefined) {
						prevScore = move.score;
					} else if (move.score < prevScore) {
						return false;
					}
					return true;
				});

			let mv = bestMoves[~~(Math.random() * bestMoves.length)];  // TODO remove random

			generatedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
		}
		return generatedMove;
	}
	private escapeCheck = (lastMove: string): void => {
		// console.log(' entered escapeCheck');
		const
			control = Game.control,
			checkingSide: SIDE = lastMove[0] as SIDE,
			checkedSide: SIDE = (checkingSide === 'W') ? 'B' : 'W',
			kingPid: PID = checkedSide + 'K',
			king: Piece = control.getPiece(kingPid),
			kLegals: SQID[] = king.getLegals(),
			chckrs: PID[] = king.getAttckrs();

		let scoredMoves: IScoredMove[] = [];

		if (chckrs.length === 1) {
			const
				chckrPid = chckrs[0],
				chckrPiece = control.getPiece(chckrPid),
				attckrs = chckrPiece.getAttckrs(),
				intrcptPidtos = // cannot be intercepted if attacking piece is a Knight
					(!IS_KNIGHT.test(chckrPid)) ? control.interceptAlignment(king, chckrPiece.getSqid()) : [];

			for (const ccpid of attckrs) {
				const
					ccpiece = control.getPiece(ccpid),
					to = chckrPiece.getSqid();
				if (!ccpiece.isPinned(to)) {
					const
						ppid = this.promo(ccpid, to),
						score = this.squareValueReOccupy([(ppid ? ppid : ccpid), to]);
					scoredMoves.push({ pid: ccpid, to: to, ppid: ppid, score: score });
				}
			}

			for (const pidto of intrcptPidtos) {
				const
					[ipid, ito] = pidto,
					intrcptPiece = control.getPiece(ipid);
				if (!intrcptPiece.isPinned(ito)) {
					const
						ippid = this.promo(ipid, ito),
						score = this.squareValueReOccupy([(ippid ? ippid : ipid), ito]);
					scoredMoves.push({ pid: ipid, to: ito, ppid: ippid, score: score });
				}
			}
		}

		for (const sqid of kLegals) {
			const
				pid = control.getPid(sqid),
				score = (pid) ? control.getPieceWorth(pid) : 0;
			scoredMoves.push({ pid: kingPid, to: sqid, ppid: null, score: score });
		}

		scoredMoves.sort(this.rankByLowestScore);
		let mv = scoredMoves[0];
		this.computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
	}
	private deliverMate = (lastMove: string): IGeneratedMove => {
	// return a move that will give check mate (or TODO a move that will definitely lead to check mate ?)
	// NB this strategy does not bother to score all possible moves it considers due to overcomplication of code
		// console.log('deliverMate')
		const
			control = Game.control,
			currentPlayer: SIDE = control.getCurrentPlayer(),
			lastPlayer: SIDE = currentPlayer === 'W' ? 'B' : 'W',
			kpid: PID = lastPlayer + 'K',
			kpiece: Piece = control.getPiece(kpid),
			klegals: SQID[] = kpiece.getLegals(),
			kaccessors: SQID[] = kpiece.getAccessors(),
			ksqid: SQID = kpiece.getSqid(),
			kattckng: PID[] = kpiece.getAttckng(),
			enPassant: SQID = control.getEnPassant(),
			reduceOppKingLegals = (pidto: PID_TO, legals): SQID[] => {
				const
					[chckngPid, chckngSqid] = pidto,
					chkngDrctn: DIRECTION = Board.getDirection(chckngSqid, ksqid),
					squaresInDirection: SQID[] = Board.fromDirectionSquares(chckngSqid, chkngDrctn);

				for (const sq of squaresInDirection) {
				    const n = legals.indexOf(sq);
				    (n >= 0) && legals.splice(n, 1);
				}
				return legals;
			},
			kingMoveOutOfCheck = (pidto: PID_TO, shadowedPidto?: PID_TO): SQID[] => {
				let
					klegals = kpiece.getLegals(),
					mrvld: SQID[] = this.revealedSquares(pidto),
					shrvld: SQID[] = shadowedPidto ? this.revealedSquares(shadowedPidto) : [];

				klegals = reduceOppKingLegals(pidto, klegals);
				klegals = klegals.length ? klegals.filter(sq => !mrvld.includes(sq)) : klegals;
				if (shadowedPidto) {
					klegals = klegals.length ? reduceOppKingLegals(shadowedPidto, klegals) : [];
					klegals = klegals.length ? klegals.filter(sq => !shrvld.includes(sq)) : [];
				}
				return klegals;
			},
			kingEscapeByCapture = ([pid, to]): boolean => {
				for (const attckdpid of kattckng) {
					const
						kattckd = control.getPiece(attckdpid),
						dfndrs = kattckd.getDfndrs();
					if (dfndrs.length === 1 && dfndrs.includes(pid)) {
					// attacked piece may no longer be defended by moving piece
						const
						 	sq = kattckd.getSqid(),
							d = Board.getDirection(to, sq);
						if (Board.alignedWith(to, d) !== kattckd) { // not able to defend after move!
							return true;
						}
					}
				}
				return false;
			};

		const
			checks: IScoredMove[] = this.deliverCheck();
		let
			score = 0,
			shdwsqid: SQID = null,
			ppid: PID = null,
			scoredMoves: IScoredMove[] = [];
		for (const check of checks) {
			const
				mpid = check.ppid ? check.ppid : check.pid,
				mpiece = control.getPiece(mpid),
				shadowing = mpiece.getKShadow(),
				mto = check.to,
				drctn = Board.getDirection(mto, ksqid);
			let
				remainingKingLegals: SQID[];
			if (enPassant && IS_PAWN.test(mpid)) {
				const
					eppiece = control.getPiece(enPassant),
					rank = enPassant[1],
					pdrctn = (rank === '4') ? DIRECTION.S : DIRECTION.N,
					captureEpSqid = Board.nextSquare(pdrctn, enPassant);
				if (captureEpSqid === mto) { // capture enpassant
					 const kpin = eppiece.getKPin();
					 if (kpin) {
						 const
							dscvrdPiece = control.getPiece(kpin);
						 if (dscvrdPiece.getAttckrs().length === 0) {
							 // one could consider this an ideal situation
							 const
							 	drctn = Board.getDirection(enPassant, ksqid),
								squaresInDirection = Board.fromDirectionSquares(enPassant, drctn);
							let
								klgls: SQID[] = klegals.filter(ds => !squaresInDirection.includes(ds));
							if (klgls.length === 0) {
							 // discovered check, maybe interceptable but nowhere to run
								 ppid = this.promo(mpid, mto);
								 return { pid: mpid, to: mto, ppid: ppid }
							}
						}
					}
				}
			} else if (!mpiece.isPinned(mto)) {
				const
					chckng = mpiece.getStep()
							? Board.nextSquare(drctn, mto) === ksqid
							: kaccessors.includes(mto);

				if (chckng && shadowing) {
					// double check, can king escape?
					shdwsqid = control.getPiece(shadowing).getSqid();
					if ((remainingKingLegals = kingMoveOutOfCheck([mpid, mto], [shadowing, shdwsqid])).length === 0) {
						if (!kingEscapeByCapture([mpid, mto])) {
							ppid = this.promo(mpid, mto);
							return { pid: mpid, to: mto, ppid: ppid };
						}
					}
				} else if (chckng) {
					// can king escape, can piece be taken, can check be intercepted?
					if ((remainingKingLegals = kingMoveOutOfCheck([mpid, mto])).length === 0) {
						if (!kingEscapeByCapture([mpid, mto])) {
							ppid = this.promo(mpid, mto);
							score = this.squareValueReOccupy([(ppid ? ppid : mpid), mto]);
							scoredMoves.push({ pid: mpid, to: mto, ppid: ppid, score: score });
						}
					}
				} else if (shadowing) {
					// can king escape, can piece be taken, can check be intercepted?
					shdwsqid = control.getPiece(shadowing).getSqid();
					if ((remainingKingLegals = kingMoveOutOfCheck([shadowing, shdwsqid])).length === 0) {
						if (!kingEscapeByCapture([mpid, mto])) {
							ppid = this.promo(mpid, mto);
							score = this.squareValueReOccupy([(ppid ? ppid : mpid), mto]);
							scoredMoves.push({ pid: mpid, to: mto, ppid: ppid, score: score });
						}
					} else { // legals remain even after klegals reduction by shadowed piece
						// can the remaining squares be attacked by the moving piece?
						let
							chckngMoves: SQID[] = [],
							rmngklgls: SQID[] = [];
						for (const sqid of remainingKingLegals) { // ???????
							const squares = Board.moveTowards(sqid, mpiece.getLegalPositions(), mpiece.directions);
							if (!squares.length) {
								rmngklgls.push(sqid);
							} else {
								chckngMoves.push(...squares);
							}
						}

						if (!rmngklgls.length && chckngMoves.length) {
							// all legals addressed so any move by discovering piece we found will do...
							for (const chksq of chckngMoves) {
								ppid = this.promo(mpid, chksq);
								score = this.squareValueReOccupy([(ppid ? ppid : mpid), chksq]);
								scoredMoves.push({ pid: mpid, to: chksq, ppid: ppid, score: score });
							}
						}
					}
				}
			}
		}

		const sortedMoves = scoredMoves.sort((a: IScoredMove, b: IScoredMove) => { return b.score - a.score; });

		if (sortedMoves.length && sortedMoves[0].score >= 0) {
			const mv = sortedMoves[0];
			return { pid: mv.pid, to: mv.to, ppid: null };
		}

		return null;
	}
	private considerCaptures = (): IGeneratedMove => {
		// console.log(' entered considerCaptures');
		const
			escapeCapture: IScoredMove = this.escapeCapture(),
			tryCapture: IScoredMove = this.tryCapture(),
			move = (escapeCapture && tryCapture)
				? (escapeCapture.score > tryCapture.score) ? escapeCapture : tryCapture
				: escapeCapture || tryCapture;

		return (move && move.score >= 0) ? { pid: move.pid, to: move.to, ppid: move.ppid } : null;
	}
	private tryCapture = (): IScoredMove => {
		// console.log(' entered tryCapture');
		const
			control = Game.control,
			currentPlayer: SIDE = control.getCurrentPlayer(),
			lastturn: SIDE = (currentPlayer === 'W') ? 'B' : 'W',
			oppsidePids: PID[] = control.getPidArray(lastturn),
			ep = control.getEnPassant();

		// find all pieces I am attacking and check their defences
		let
			pidtos: PID_TO[] = [],
			scoredMoves: IScoredMove[] = [];

		for (const opid of oppsidePids) {
			const
				opiece = control.getPiece(opid),
				oattckrs = opiece.getAttckrs(),
				osqid = opiece.getSqid();
			for (const pid of oattckrs) {
				const piece = control.getPiece(pid);
				if ((osqid === ep) && IS_PAWN.test(opid) && IS_PAWN.test(pid)) {
					const epcapture = (ep[0] + ((ep[1] === '4') ? '3' : '6')) as SQID;
					if (piece.getLegals().includes(epcapture) && !piece.isPinned(epcapture)) {
						pidtos.push([pid, epcapture]);
					} else if (!piece.isPinned(osqid)) {
						pidtos.push([pid, osqid]);
					}
				} else if (!piece.isPinned(osqid)) {
					pidtos.push([pid, osqid]);
				}
			}
		}

		for (const [pid, to] of pidtos) {
			const
				ppid = this.promo(pid, to),
				score = this.squareValueReOccupy([(ppid ? ppid : pid), to]);
			scoredMoves.push({ pid: pid, to: to, ppid: ppid, score: score });
		}

		let scoredMove: IScoredMove = null;
		if (scoredMoves.length) {
			scoredMoves.sort(this.rankByLowestScore);
			return scoredMoves[0];
		}
		return scoredMove;
	}
	private escapeCapture = (): IScoredMove => {
		// console.log(' entered escapeCapture');
		const
			control = Game.control,
			currentPlayer: SIDE = control.getCurrentPlayer(),
			movingSidePids: PID[] = control.getPidArray(currentPlayer);

		// find all my pieces that are attacked and try to ensure their defences
		let scoredMoves: IScoredMove[] = [];

		for (const mpid of movingSidePids) {
			const
				mpiece = control.getPiece(mpid),
				mattckrs = mpiece.getAttckrs(),
				msqid = mpiece.getSqid();
			if (mattckrs.length) {
				for (const apid of mattckrs) {
					const piece = control.getPiece(apid);
					if (!piece.isPinned(msqid)) {
						const
							ppid = this.promo(apid, msqid),
							score = this.squareValueReOccupy([(ppid ? ppid : apid), msqid]);
						scoredMoves.push({ pid: apid, to: msqid, ppid: ppid, score: score });
					}
				}
			}
		}

		let scoredMove: IScoredMove = null;
		scoredMoves.sort(this.rankByLowestScore);
		let mv = scoredMoves.length ? scoredMoves[0] : null;
		if (mv && mv.score > 0) {
			// defend against highest scored attack
			// either move out of attack, take attacking piece or intercept the attack
			// either way we save the value of the piece so add that onto the score
			// console.log(`We should mitigate this attack - pid: ${mv.pid}, to: ${mv.to}, severity: ${mv.score}`);
			scoredMove = this.defendPieceOnSqid([mv.pid, mv.to]);
			scoredMove && (scoredMove.score += mv.score);
		}
		return scoredMove;
	}
	private kingHunt = (): IGeneratedMove => {
		// if the opponent king has no legal positions, find a way to attack it,
		// otherwise can the kings legal positions be reduced.
		// console.log(' entered kingHunt');
		const
			control = Game.control,
			currentPlayer = control.getCurrentPlayer(),
			oppside: SIDE = currentPlayer === 'W' ? 'B' : 'W',
			oppKpid: PID = oppside + 'K',
			oppKpiece: Piece = control.getPiece(oppKpid),
			oppKsqid: SQID = oppKpiece.getSqid(),
			oppKAccessors: SQID[] = oppKpiece.getAccessors(),
			mypids: PID[] = control.getPidArray(currentPlayer),
			isMoveAllowed = (pid: PID, drctn: DIRECTION, to: SQID, onto: SQID): boolean => {
				// return !(IS_KING.test(pid)
				// 		|| (IS_PAWN.test(pid)
				// 			&& (!ORDINALS.includes(drctn)
				// 				|| onto !== Board.nextSquare(drctn, to))));
				return !(IS_PAWN.test(pid) && (!ORDINALS.includes(drctn) || onto !== Board.nextSquare(drctn, to)));			};

		let pidToOntos: PID_TO_ONTO[] = [];
		for (const pid of mypids) {
			const
				piece = control.getPiece(pid),
				drctns = piece.directions,
				legals = piece.getLegals();
			for (const to of legals) {
				for (const onto of oppKAccessors) {
					// find potential lines of attack
					const drctn = Board.getDirection(to, onto);
					if (drctns.includes(drctn)) {
						if (isMoveAllowed(pid, drctn, to, onto)) {
							const kdrctn = Board.getDirection(onto, oppKsqid);
							if (drctns.includes(kdrctn)) {
								const alignedPiece = Board.alignedWith(to, drctn);
								// eliminate where direction from 'to' square to attacked king is not available for attacking piece
								if (!alignedPiece || (alignedPiece.getSide() === oppside && alignedPiece.getSqid() === onto)) {
									const pidToOnto: PID_TO_ONTO = [pid, to, onto];
									pidToOntos.push(pidToOnto);
								}
							}
						}
					}
				}
			}
		}

		let scoredMoves: IScoredMove[] = [];
		for (const [pid, to, onto] of pidToOntos) {
			const piece = control.getPiece(pid);
			if (!piece.isPinned(to)) {
				const
					ppid = this.promo(pid, to),
					score = this.squareValueReOccupy([(ppid ? ppid : pid), to]);
				scoredMoves.push({ pid: pid, to: to, ppid: ppid, score: score });
			}
		}

		let computedMove: IGeneratedMove = null;
		if (scoredMoves.length) {
			scoredMoves.sort(this.rankByLowestScore);
			let mv = scoredMoves[0];
			if (mv.score >= 0) { // must be some advantage
				computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
			}
		}
		return computedMove;
	}
	private defendPieceOnSqid = ([opid, to]: PID_TO): IScoredMove => {
		// console.log(' entered defendPieceOnSqid');
		// if (apid==='WKB' && to==='d7') {
		// 	console.log('bingo');
		// }
		const
			control = Game.control,
			mypid = control.getPid(to),
			myPiece = control.getPiece(mypid),
			legals: SQID[] = myPiece.getLegals(),
			attackedAttckrs: PID[] = myPiece.getAttckrs(),
			ep = control.getEnPassant();

		let scoredMoves: IScoredMove[] = [];

		if (attackedAttckrs.length === 1) {
			const
				attckrPiece = control.getPiece(opid),
				attckrAttckrs = attckrPiece.getAttckrs(),
				intrcptPidtos = // cannot be intercepted if attacking piece is a Knight
					!IS_KNIGHT.test(opid) ? control.interceptAlignment(myPiece, attckrPiece.getSqid()) : [];

			for (const ccpid of attckrAttckrs) {
				const ccpiece = control.getPiece(ccpid);
				let captureSqid: SQID = null;
				if (IS_PAWN.test(ccpid) && ep) {
					captureSqid = (ep[0] + ((ep[1] === '4') ? '3' : '6')) as SQID;
				}
				const ccto = (captureSqid && ccpiece.getLegals().includes(captureSqid)) ? captureSqid : attckrPiece.getSqid();
				if (ccpiece.isPinned(ccto)) { return; }
				const
					cppid = this.promo(ccpid, ccto),
					cscore = this.squareValueReOccupy([(cppid ? cppid : ccpid), ccto]);
				scoredMoves.push({ pid: ccpid, to: ccto, ppid: cppid, score: cscore });
			}

			for (const pidto of intrcptPidtos) {
				const
					[ipid, ito] = pidto,
					intrcptPiece = control.getPiece(ipid);
				if (intrcptPiece.isPinned(ito)) { return; }
				const
					ippid = this.promo(ipid, ito),
					iscore = this.squareValueReOccupy([(ippid ? ippid : ipid), ito]);
				scoredMoves.push({ pid: ipid, to: ito, ppid: ippid, score: iscore });
			}
		}

		for (const sqid of legals) {
			if (myPiece.isPinned(sqid)) { continue; }
			const lscore = this.squareValueReOccupy([mypid, sqid]);
			scoredMoves.push({ pid: mypid, to: sqid, ppid: null, score: lscore });
		}

		scoredMoves.sort(this.rankByLowestScore);
		let mv = scoredMoves.length ? scoredMoves[0] : null;
		if (mv && mv.score >= 0) {
			// defend against highest scored attack
			// either move out of attack, take attacking piece or intercept the attack
			return mv;
		} else if (!IS_KING.test(opid)) {
			// can't take the attacker, can't intercept, can't move attacked piece
			// can attacked be supported? NNB is not an option if attacked piece is King
			const
				movingSidePids: PID[] = control.getPidArray(mypid[0] as SIDE),
				attckAccessors = myPiece.getAccessors();
			for (const sqid of attckAccessors) {
				 for (const mpid of movingSidePids) {
					const mpiece = control.getPiece(mpid);
					if (mpiece.getLegals().includes(sqid)) {
						const drctn = Board.getDirection(sqid, to);
						if (mpiece.directions.includes(drctn)) {
							if (!(IS_KING.test(mpid) || (IS_PAWN.test(mpid) && (!ORDINALS.includes(drctn) || to !== Board.nextSquare(drctn, sqid))))) {
								if (mpiece.isPinned(sqid)) { return; }
								const
									mppid = this.promo(mpid, sqid),
									mscore = this.squareValueReOccupy([(mppid ? mppid : mpid), sqid]);
								scoredMoves.push({ pid: mpid, to: sqid, ppid: mppid, score: mscore });
							}
						}
					}
				}
			}

			scoredMoves.sort(this.rankByLowestScore);
		}

		return scoredMoves.length ? scoredMoves[0] : null;
	}
	squareValueReOccupy = ([mpid, mto]: PID_TO, promoted: boolean = false): number => {
		// note that scoring is always with respect to the side of first moving piece i.e. mpid
		if (mpid === 'BKNP' && mto === 'h5') {
			console.log('bullseye squareValueReOccupy');
		}
		let retScore: number = this.moveScorer({pid: mpid, to: mto, ppid: null });
		if (retScore) {
			// this move has already been scored - no need to redo
			return retScore;
		} else {
			retScore = 0;
		}

		const
			control = Game.control,
			myside: SIDE = mpid[0] as SIDE,
			oppside: SIDE = (myside === 'W') ? 'B' : 'W',
			mpiece = control.getPiece(mpid),
			mpRank: number = control.getPieceWorth(mpid),
			cpid = control.getPid(mto), // pid of a captured piece
			cpRank: number = cpid ? control.getPieceWorth(cpid) : 0,
			nextExchangerPid = (exchangerPids: [PID, number][][], side: SIDE): [PID, number] => {
				let drctn = -1, pid = null, rank = 1001;
				exchangerPids.forEach((element, index, array) => {
					const
						[epid, erank] = element[0],
						epiece = control.getPiece(epid),
						pinned = epiece.isPinned(mto);
					if (epid[0] === side && !pinned && erank < rank) {
						drctn = index;
						pid = epid;
						rank = erank;
					}
				});
				if (pid) {
					const pidWithRank = exchangerPids[drctn].shift();
					(exchangerPids[drctn].length === 0) && (delete exchangerPids[drctn]);
					return pidWithRank;
				}
				return null;
			};

		if (mpiece && mpiece.isPinned(mto)) {
			return -1000; // move not allowed
		}

		let
			pidsWithRankByDirection: [PID, number][][] = control.squareExchangers([mpid, mto], promoted),
			myScore: number = cpRank,
			oppScore: number = 0,
			myMove = true,
			pid = mpid,
			rank = mpRank;

		if (pidsWithRankByDirection.length) {
			while (pidsWithRankByDirection.length) {
				let
					myNxtPiece: PID_WITH_RANK,
					oppNxtPiece: PID_WITH_RANK;
				if (myMove) {
					oppNxtPiece = nextExchangerPid(pidsWithRankByDirection, oppside);
					myNxtPiece = nextExchangerPid(pidsWithRankByDirection, myside);
				} else {
					myNxtPiece = nextExchangerPid(pidsWithRankByDirection, myside);
					oppNxtPiece = nextExchangerPid(pidsWithRankByDirection, oppside);
				}

				if (IS_KING.test(pid) && (myMove ? oppNxtPiece : myNxtPiece)) {
					// king would be moving into check - so disallow
					// const mypieces = myMove ? mattckrsWithRank : odfndrsWithRank;
					// mypieces.length && mypieces.push([pid, rank]); // put on end but not if end is beginning
					retScore = myMove ? myScore -= rank : oppScore -= rank;
					continue; // other defenders?
				} else if (myMove) {
					if (!oppNxtPiece) {
						retScore = myScore - oppScore;
						break;
					} else if (!myNxtPiece) {
						retScore = cpRank - rank;
						break;
					} else if (rank > oppNxtPiece[1]) {
						retScore = -rank;
						break;
					}
				} else {
					if (!myNxtPiece) {
						retScore = -(oppScore - myScore);
						break;
					} else if (!oppNxtPiece) {
						retScore = rank - myScore;
						break;
					} else if (rank > myNxtPiece[1]) {
						retScore = -rank;
						break;
					}
				}

				myMove ? myScore += rank : oppScore += rank;
				myMove = !myMove;

				pid = myMove ? myNxtPiece[0] : oppNxtPiece[0];
				rank = myMove ? myNxtPiece[1] : oppNxtPiece[1];
			}
		} else {
			retScore = myScore;
		}


		return this.moveScorer({pid: mpid, to: mto, ppid: null }, retScore);
	}
	revealedSquares([pid, to]): SQID[] {
		let revealedSqids: SQID[] = [];
		const
			control = Game.control,
			piece = control.getPiece(pid),
			from = piece.getSqid(),
			mySide = pid[0],
			rvlblDrctns: DIRECTION[] = [].concat(...CARDINALS).concat(...ORDINALS);
		// step in each direction and find my sides discovered attacks
		for (const drctn of rvlblDrctns) {
			const alignedPiece = Board.alignedWith(from, drctn);
			if (alignedPiece && alignedPiece.getSide() === mySide) {
				const
					apid = alignedPiece.getPid(),
					asqid = alignedPiece.getSqid();
				if (!(IS_PAWN.test(apid) || IS_KING.test(apid) || IS_KNIGHT.test(apid))) {
					const d = Board.getDirection(asqid, from);
					if (alignedPiece.directions.includes(d)) {
						const sqids = Board.fromDirectionSquares(from, d);
						revealedSqids.push(...sqids);
					}
				}
			}
		}

		return revealedSqids;
	}
	private deliverCheck = (): IScoredMove[] => {
		// console.log(' entered deliverCheck');
		const
			control = Game.control,
			currentPlayer: SIDE = control.getCurrentPlayer(),
			oppPlayer: SIDE = currentPlayer === 'W' ? 'B' : 'W',
			kpid: PID = oppPlayer + 'K',
			kpiece: Piece = control.getPiece(kpid),
			ksqid: SQID = kpiece.getSqid(),
			kaccessors: SQID[] = kpiece.getAccessors(),
			myPids: PID[] = control.getPidArray(currentPlayer),
			enPassant: SQID = control.getEnPassant();

		let
			pidtos: string[] = [],
			strfyPidTo: string;
		for (const sqid of kaccessors) {  // for each of the opposing kings access squares
			const drctn = Board.getDirection(sqid, ksqid)
			for (const mpid of myPids) { // which of my sides pieces can legally move to the access square?
				const
					mpiece = control.getPiece(mpid),
					shadowing = mpiece.isShadowing(sqid),
					mlegals = mpiece.getLegals();

				if (!mlegals.includes(sqid) || mpiece.isPinned(sqid)) {
					continue;
				}

				strfyPidTo = null;
				if (enPassant && IS_PAWN.test(mpid)) {
					const
						eppiece = control.getPiece(enPassant),
						rank = enPassant[1],
						pdrctn = (rank === '4') ? DIRECTION.S : DIRECTION.N,
						captureEpSqid = Board.nextSquare(pdrctn, enPassant);
					if (captureEpSqid === sqid) { // capture enpassant
						const kpin = eppiece.getKPin();
						if (kpin) {
							strfyPidTo = JSON.stringify([mpid, sqid]);
							pidtos.push(strfyPidTo);
						 }
					}
				} else if (!IS_KING.test(mpid)) {
					if (!shadowing) {
						if (mpiece.directions.includes(drctn)) {
							if (!(IS_PAWN.test(mpid) && (!ORDINALS.includes(drctn)
									|| ksqid !== Board.nextSquare(drctn, sqid)))) {
								strfyPidTo = JSON.stringify([mpid, sqid]);
								pidtos.push(strfyPidTo);
							}
						}
					} else {
						for (const shsqid of mlegals) {
							if (!mpiece.isPinned(shsqid)) {
								strfyPidTo = JSON.stringify([mpid, shsqid]);
								if (!pidtos.includes(strfyPidTo)) {
									pidtos.push(strfyPidTo);
								}
							}
						}
					}
				}
			}
		}


		let
			scoredChecks: IScoredMove[] = [];
		for (const pidto of pidtos) {
			const
				[pid, to] = JSON.parse(pidto),
				cpiece = control.getPiece(pid);
			if (!cpiece.isPinned(to)) {
				// can this be moved into accessorts foreach above?
				const
					ppid = this.promo(pid, to),
					score = this.squareValueReOccupy([(ppid ? ppid : pid), to]);
				scoredChecks.push({ pid: pid, to: to, ppid: ppid, score: score });
			}
		}

		return scoredChecks;
	}
}
