import { PID, PID_TO, PID_FROM_TO, SQID, SIDE, IS_KING, IS_PAWN, IS_KNIGHT, DIRECTION, ORDINALS } from "./Model";
import { IScoredMove, IGameMove, IGeneratedMove, BasicPieceRank } from "./Model";
import {Piece} from "./Piece";
import {Game} from "./Game";
import {Board} from "./Board";

export class ComputedMove {

  // keep track of which parts of a move have been enacted
  private enactedMove: IGameMove = { pid: null, to: null, ppid: null, result: null };

  // parts of a move thought up by the program
  private computedMove: IGeneratedMove = {  pid: null, to: null, ppid: null };
  // private lastMove = '';

  compute = (lastMove: string): void => {
    // this.lastMove = lastMove;
    if (!this.enactedMove.pid) {
      if (lastMove) {
        if (lastMove.endsWith('#')){  // checkmate
          return;
        } else if (lastMove.endsWith('=')) {
          // stalemate due to repetition
          return;
        } else if (lastMove.endsWith('+')) {
          // is not checkmate so can escape
          this.escapeCheck(lastMove);
        }
      }
    }

    const strategies: Function[] = [
      this.escapeCapture,
      this.deliverCheck,
      this.tryCapture,
      this.kingHunt,
      this.computeRandomMove
    ];

    if (this.computedMove.pid === null) {
      let generatedMove: IGeneratedMove = null;
      for (let idx = 0; idx < strategies.length; idx += 1) {
        const func = strategies[idx];
        if (generatedMove = func()) {
          this.computedMove = generatedMove;
          break;
        }
      }
    }

    this.performComputedMove();
  }
  private isMoveAllowed = (pid: PID, drctn: DIRECTION, from: SQID, to: SQID): boolean => {
    return  !(IS_KING.test(pid)
              || (IS_PAWN.test(pid)
                  && (!ORDINALS.includes(drctn)
                      || to !== Board.nextSquare(drctn, from))));
  }
  private sortPidsAndRank = (pids: PID[]): [PID, number][] => {
    const sortedPids = this.sortPidsByLowestRank(pids);
    let sortedPidsAndRanks: [PID, number][] = [];
    sortedPids.map(pid => {
      sortedPidsAndRanks.push([pid, BasicPieceRank[pid[pid.length - 1]]]);
    });
    return sortedPidsAndRanks;
  }
  private sortPidsByLowestRank = (pids: PID[]): PID[] => {
    // Kings always last in exchange
    return pids.sort((apid, bpid) => { // rank by lowest piece value first
      const
        abpr = IS_KING.test(apid) ? 10 : BasicPieceRank[apid[apid.length - 1]],
        bbpr = IS_KING.test(bpid) ? 10 : BasicPieceRank[bpid[bpid.length - 1]];
      return  abpr - bbpr;
    });
  }
  private scorer = (a, b): number => {
  	// rank by lowest piece value within highest score first
  	const
      apid = a.pid,
      bpid = b.pid,
  		abps = a.score + BasicPieceRank[apid[apid.length - 1]],
  		bbps = b.score + BasicPieceRank[bpid[bpid.length - 1]];
  	if (a.score === b.score) {
  			return abps - bbps;
  	}
  	return  b.score - a.score
  }
  private promo = (pid: PID, sqid: SQID): PID => {
    let retpid: PID = null;
    if (IS_PAWN.test(pid)) {
      const
        side: SIDE = pid[0] as SIDE,
        rank = sqid[1];
      if (rank === '8' || rank === '1') {
        const promPidArray: PID[] = [side + 'Q', side + 'R', side + 'B', side + 'N'];
        // retpid = promPidArray[~~(Math.random() * promPidArray.length)];
        retpid = side + 'Q'; // always return the queen for now
      }
    }
    return retpid;
  }
  private performComputedMove = (): void => {
    const
      control = Game.control,
      cpid = this.computedMove.pid,
      cpiece = control.getPiece(cpid),
      cfrom = cpiece.getSqid(),
      cto = this.computedMove.to,
      cppid = this.computedMove.ppid;

    let elmnt: HTMLElement = null;

    if (this.enactedMove.pid === null)  {
      this.enactedMove.pid = cpid;
      elmnt = document.getElementById(cfrom);
    } else if (this.enactedMove.to === null) {
      if (cppid) {
        this.enactedMove.to = cto;
      } else {
        this.enactedMove = { pid: null, to: null, ppid: null, result: null };
        this.computedMove = this.enactedMove;
      }
      elmnt = document.getElementById(cto);
    } else {
      this.enactedMove = { pid: null, to: null, ppid: null, result: null };
      this.computedMove = this.enactedMove;
      elmnt = document.getElementById(cppid);
    }
    elmnt.click();
  }
  private kingHunt = (): IGeneratedMove => {
    // if the opponent king cannot move legally, find a way to attack it,
    // otherwise can the kings legal positions be reduced.
    const
      control = Game.control,
      oppside: SIDE = Game.nextTurn === 'W' ? 'B' : 'W',
      oppKpid: PID = oppside + 'K',
      oppKpiece: Piece = control.getPiece(oppKpid),
      oppKsqid: SQID = oppKpiece.getSqid(),
      oppKlegals: SQID[] = oppKpiece.getLegals(),
      oppKAccessors: SQID[] = oppKpiece.getAccessors(),
      pids: PID[] = control.getPidArray(Game.nextTurn);

    let pidToFroms: PID_FROM_TO[] = [];
    pids.forEach(pid => {
      const
        piece = control.getPiece(pid),
        drctns = piece.directions,
        legals = piece.getLegals();
      oppKAccessors.forEach(to => {
        legals.forEach((from) => {
          // find potential lines of attack
          const drctn = Board.getDirection(from, to);
          if (drctns.includes(drctn)) {
            if (this.isMoveAllowed(pid, drctn, from, to)) {
              const kdrctn = Board.getDirection(to, oppKsqid);
              if (drctns.includes(kdrctn)) {
                const alignedPiece = Board.alignedWith(from, drctn);
                // eliminate where direction from 'to' square to attacked king is not avaliable to attacking piece
                if (!alignedPiece || (alignedPiece.getSide() === oppside && alignedPiece.getSqid() === to)) {
                  const pidtofrom: PID_FROM_TO = [pid, from, to];
                  pidToFroms.push(pidtofrom);
                }
              }
            }
          }
        });
      })
    });

    let scoredMoves: IScoredMove[] = [];
    pidToFroms.forEach(([pid, from, to]) => {
      const piece = control.getPiece(pid);
      if (!piece.isPinned(from)) {
        const score = this.squareValueReOccupy([pid, from]);
        scoredMoves.push({ pid: pid, to: from, ppid: this.promo(from, to), score: score });
      }
    });

    let computedMove: IGeneratedMove = null;
    if (scoredMoves.length) {
      scoredMoves.sort(this.scorer);
      let mv = scoredMoves[0];
      if (mv.score >= 0) { // must be some advantage
        computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
      }
    }
    return computedMove;
  }
  private computeRandomMove = (): void => {
    const
      control = Game.control,
      pids: PID[] = control.getPidArray(Game.nextTurn)

    let
      nextMove: IGeneratedMove = { pid: null, to: null, ppid: null },
      mpid: PID,
      mpiece: Piece,
      mlegals: SQID[],
      mto: SQID;

    while (true) {
      if (pids.length){
          mpid = pids[~~(Math.random() * pids.length)];
          mpiece = control.getPiece(mpid);
          mlegals = mpiece.getLegals();

        if (mlegals.length) {
          nextMove.pid = mpid;
          break;
        } else {
          pids.splice(pids.indexOf(mpid), 1);
        }
      } else {
        console.log('zugzwang??');
      }
    }

    mto = mlegals[~~(Math.random() * mlegals.length)];

    nextMove.to = mto;
    nextMove.ppid = this.promo(mpid, mto);

    this.computedMove = nextMove;
  }
  private escapeCheck = (lastMove: string): void => {
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
        // control = Game.control,
        chckrPid = chckrs[0],
        chckrPiece = control.getPiece(chckrPid),
        attckrs = chckrPiece.getAttckrs(),
        intrcptPidtos = // cannot be intercepted if attacking piece is a Knight
          !IS_KNIGHT.test(chckrPid) ? control.interceptAlignment(king, chckrPiece) : [];

      attckrs.forEach((ccpid) => {
        const
          ccpiece = control.getPiece(ccpid),
          to = chckrPiece.getSqid();

        if (ccpiece.isPinned(to)) { return; }
        const score = this.squareValueReOccupy([ccpid, to]);
        scoredMoves.push({ pid: ccpid, to: to, ppid: this.promo(ccpid, to), score: score });
      });

      intrcptPidtos.forEach((pidto) => {
        const
          [ipid, ito] = pidto,
          intrcptPiece = control.getPiece(ipid);

        if (intrcptPiece.isPinned(ito)) { return; }

        let score = this.squareValueReOccupy([ipid, ito]);
        scoredMoves.push({ pid: ipid, to: ito,   ppid: this.promo(ipid, ito), score: score });
      });
    }

    kLegals.forEach((sqid) => {
      const
        pid = control.getPid(sqid),
        score = (pid) ? BasicPieceRank[pid[pid.length - 1]] : 0;
      scoredMoves.push({ pid: kingPid, to: sqid, ppid: null, score: score });
    });

    scoredMoves.sort(this.scorer);
    let mv = scoredMoves[0];
    this.computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
  }
  private deliverCheck = (): IGeneratedMove => {
    const
      control = Game.control,

      nextturn: SIDE = Game.nextTurn,
      lastturn: SIDE = nextturn === 'W' ? 'B' : 'W',

      kpid: PID = lastturn + 'K',
      kpiece: Piece = control.getPiece(kpid),
      klegals: SQID[] = kpiece.getLegals(),
      ksqid: SQID = kpiece.getSqid(),
      kaccesSqrs: SQID[] = kpiece.getAccessors(),
      pidArray: PID[] = control.getPidArray(nextturn);

    let
      pidtos: PID_TO[] = [],
      scoredMoves: IScoredMove[] = [];

    kaccesSqrs.forEach((sqid) => {  // for each opposing kings access squares
      const drctn = Board.getDirection(sqid, ksqid)
      pidArray.forEach((pid) => { // which of my sides pieces can legally move to the access square?
        const
          piece = control.getPiece(pid),
          plegals = piece.getLegals();
        if (plegals.includes(sqid)) {
          if (piece.directions.includes(drctn)) {
            if (!(IS_KING.test(pid) || (IS_PAWN.test(pid) && (!ORDINALS.includes(drctn) || ksqid !== Board.nextSquare(drctn, sqid))))) {
              // if (!piece.isPinned(sqid)) {
              //   // can this be moved into accessorts foreach above?
              //   const
              //     ppid = this.promo(pid, sqid),
              //     score = this.squareValueReOccupy([pid, sqid]);
              //   scoredMoves.push({ pid: pid, to: sqid, ppid: ppid, score: score });
              // }
              pidtos.push([pid, sqid]);
            }
          }
        }
      });
    });

    pidtos.forEach((pidto) => {
      const
        [pid, to] = pidto,
        cpiece = control.getPiece(pid);
      if (!cpiece.isPinned(to)) {
        // can this be moved into accessorts foreach above?
        const
          ppid = this.promo(pid, to),
          score = this.squareValueReOccupy([pid, to]);
        scoredMoves.push({ pid: pid, to: to, ppid: ppid, score: score });
      }
    });

    let generatedMove: IGeneratedMove = null;
    if (scoredMoves.length) {
     scoredMoves.sort(this.scorer);
     let mv = scoredMoves[0];
     if (mv.score >= 0) { // must be some advantage
       generatedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
     }
    }
    return generatedMove;
  }

  private tryCapture = (): IGeneratedMove => {
    const
      control = Game.control,
      nextturn: SIDE = Game.nextTurn,
      lastturn: SIDE = nextturn === 'W' ? 'B' : 'W',
      // lastturn: SIDE = this.lastMove[0] as SIDE,
      // nextturn: SIDE = lastturn === 'W' ? 'B' : 'W',
      oppsidePids: PID[] = control.getPidArray(lastturn);

    // find all pieces I am attacking and check their defences
    let
      pidtos: PID_TO[] = [],
      scoredMoves: IScoredMove[] = [];

    oppsidePids.forEach((opid) => {
      const
        opiece = control.getPiece(opid),
        oattckrs = opiece.getAttckrs(),
        osqid = opiece.getSqid();

      oattckrs.forEach(pid => {
        const piece = control.getPiece(pid);
        if (!piece.isPinned(osqid)) {
          pidtos.push([pid, osqid]);
        }
      });
    });

    pidtos.forEach((pidto) => {
      const
        [pid, to] = pidto,
        ppid = this.promo(pid, to),
        score = this.squareValueReOccupy([pid, to]);

      scoredMoves.push({ pid: pid, to: to, ppid: ppid, score: score });
    });

    let generatedMove: IGeneratedMove = null;
    if (scoredMoves.length) {
     scoredMoves.sort(this.scorer);
     let mv = scoredMoves[0];
     if (mv.score >= 0) { // must be some advantage
       generatedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
     }
    }
    return generatedMove;
  }

  private escapeCapture = (): IGeneratedMove => {
    const
      control = Game.control,
      // lastturn: SIDE = this.lastMove[0] as SIDE,
      // nextturn: SIDE = lastturn === 'W' ? 'B' : 'W',
      nextturn: SIDE = Game.nextTurn,
      lastturn: SIDE = nextturn === 'W' ? 'B' : 'W',
      movingSidePids: PID[] = control.getPidArray(nextturn);
      // movingSidePids: PID[] = control.getPidArray(lastturn);

    // find all my pieces that are attacked and try to ensure their defences
    let
      scoredMoves: IScoredMove[] = [],
      generatedMove: IGeneratedMove = null;

    movingSidePids.forEach((mpid) => {
      const
        mpiece = control.getPiece(mpid),
        mattckrs = mpiece.getAttckrs(),
        msqid = mpiece.getSqid();

      if (mattckrs.length) {
        mattckrs.forEach(apid => {
          const piece = control.getPiece(apid);
          if (!piece.isPinned(msqid)) {
            let score = this.squareValueReOccupy([apid, msqid]);
            scoredMoves.push({ pid: apid, to: msqid,   ppid: this.promo(apid, msqid), score: score });          }
        });
      }
    });

    scoredMoves.sort(this.scorer);
    let mv = scoredMoves.length ? scoredMoves[0] : null;
    if (mv && mv.score >= 0) {
      // defend against highest scored attack
      // either move out of attack, take attacking piece or intercept the attack
      // console.log(`We should mitigate this attack - pid: ${mv.pid}, to: ${mv.to}, severity: ${mv.score}`);
      generatedMove = this.defendPieceOnSqid([mv.pid, mv.to]);
    }
    return generatedMove;
  }
  private defendPieceOnSqid = ([apid, to]: PID_TO): IGeneratedMove => {
    const
      control = Game.control,
      attackedPid = control.getPid(to),
      attackedPiece = control.getPiece(attackedPid),
      legals: SQID[] = attackedPiece.getLegals(),
      attackedAttckrs: PID[] = attackedPiece.getAttckrs();

    let
      scoredMoves: IScoredMove[] = [],
      generatedMove: IGeneratedMove = null;

    if (attackedAttckrs.length === 1) {
      const
        attckrPiece = control.getPiece(apid),
        attckrAttckrs = attckrPiece.getAttckrs(),
        intrcptPidtos = // cannot be intercepted if attacking piece is a Knight
          !IS_KNIGHT.test(apid) ? control.interceptAlignment(attackedPiece, attckrPiece) : [];

      attckrAttckrs.forEach((ccpid) => {
        const
          ccpiece = control.getPiece(ccpid),
          to = attckrPiece.getSqid();
        if (ccpiece.isPinned(to)) { return; }
        const score = this.squareValueReOccupy([ccpid, to]);
        scoredMoves.push({ pid: ccpid, to: to, ppid: this.promo(ccpid, to), score: score });
      });

      intrcptPidtos.forEach((pidto) => {
        const
          [ipid, ito] = pidto,
          intrcptPiece = control.getPiece(ipid);
        if (intrcptPiece.isPinned(ito)) { return; }
        const score = this.squareValueReOccupy([ipid, ito]);
        scoredMoves.push({ pid: ipid, to: ito,   ppid: this.promo(ipid, ito), score: score });
      });
    }

    legals.forEach((sqid) => {
      const pid = control.getPid(sqid);

      if (pid && pid === apid) { return; } // already catered for in attckrAttckrs iteration above

      if (attackedPiece.isPinned(sqid)) { return; }
      const score = this.squareValueReOccupy([attackedPid, sqid]);
      scoredMoves.push({ pid: attackedPid, to: sqid, ppid: null, score: score });
    });

    scoredMoves.sort(this.scorer);
    let mv = scoredMoves.length ? scoredMoves[0] : null;
    if (mv && mv.score >= 0) {
      // defend against highest scored attack
      // either move out of attack, take attacking piece or intercept the attack
      this.computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
    } else if (!IS_KING.test(apid)) {
       // can't take the attacker, can't intercept, can't move attacked piece
       // can attacked be supported? NNB is not an option if attacked piece is King
      const movingSidePids: PID[] = control.getPidArray(attackedPid[0] as SIDE);
      attackedPiece.getAccessors().forEach(sqid => {
        movingSidePids.forEach(pid => {
          const piece = control.getPiece(pid);
          if (piece.getLegals().includes(sqid)) {
            const drctn = Board.getDirection(sqid, to);
            if (piece.directions.includes(drctn)) {
              if (!(IS_KING.test(pid) || (IS_PAWN.test(pid) && (!ORDINALS.includes(drctn) || to !== Board.nextSquare(drctn, sqid))))) {
                if (piece.isPinned(sqid)) { return; }
                const score = this.squareValueReOccupy([pid, sqid]);
                scoredMoves.push({ pid: pid, to: sqid, ppid: this.promo(pid, sqid), score: score });
              }
            }
          }
        });
      });

      scoredMoves.sort(this.scorer);
      let mv = scoredMoves.length ? scoredMoves[0] : null;
      if (mv && mv.score >= 0) {
        generatedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
      }
    }
    return generatedMove;
  }
  squareValueReOccupy = ([mpid, sqid]: PID_TO): number => {
    // nextTurn is taken from mPid - analysis for single move basis
    const
      control = Game.control,
      mpiece = control.getPiece(mpid), // proposed piece for moving
      mside = mpiece.getSide(), // side of moving piece
      mpRank = BasicPieceRank[mpid[mpid.length - 1]],
      cpid = control.getPid(sqid), // pid of piece for capture
      cpRank = cpid ? BasicPieceRank[cpid[cpid.length - 1]] : 0,
      cpiece = control.getPiece(cpid); // piece for capture

    let
      attckrs: PID[], dfndrs: PID[], // correspond to moving side & opposite side respectively
      [whites, blacks] = control.squareExchangers([mpid, sqid]);
      [attckrs, dfndrs] = (mside === 'W') ? [whites, blacks] : [blacks, whites];

    attckrs = attckrs.filter(pid => {
      return pid !== mpid;
    });

    if (IS_KING.test(mpid) && dfndrs.length) { return -mpRank; };

    const attckrsWithRank = this.sortPidsAndRank(attckrs);
    const dfndrsWithRank = this.sortPidsAndRank(dfndrs);

    attckrsWithRank.unshift([mpid, mpRank]); // put moving piece to front of moves

    let
      attckrScore = 0,
      dfndrScore = 0,
      attckrMove = true,
      tempRank = cpRank;

    while (true) {
      const shifted = attckrMove ? attckrsWithRank.shift() : dfndrsWithRank.shift();
      if (shifted === undefined) {
        if (attckrMove) { // add points for unused exchangers
          dfndrScore += dfndrsWithRank.length;
        } else {
          attckrScore += attckrsWithRank.length;
        }
        break;
      }
      const
        [pid, rank] = shifted,
        oppExchanger = attckrMove ? (dfndrsWithRank.length ? true : false) : (attckrsWithRank.length ? true : false);
      if (IS_KING.test(pid) && oppExchanger) { break; }
      if (attckrMove) {
        attckrScore += tempRank;
      } else {
        dfndrScore += tempRank;
      }
      tempRank = rank;
      attckrMove = !attckrMove;
    }

    return (attckrScore >= dfndrScore) ? attckrScore - dfndrScore : -(dfndrScore - attckrScore);
  }
}
