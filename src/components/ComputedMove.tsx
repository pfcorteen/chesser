import { PID, PID_TO, PID_FROM_TO, SQID, SIDE, IS_KING, IS_PAWN, IS_KNIGHT, DIRECTION, CARDINALS, ORDINALS } from "./Model";
import { IScoredMove, IGameMove, IGeneratedMove, BasicPieceRank } from "./Model";
import { Piece } from "./Piece";
import { Game } from "./Game";
import { Board } from "./Board";

export class ComputedMove {

     private static scoredMoveRegister = (): Function => {
          const movehasher = function hashCode(s) {
              let h;
              for(let i = 0; i < s.length; i++) {
                   h = Math.imul(31, h) + s.charCodeAt(i) | 0;
              }
              return h;
          };

          let moveToScoreArray: number[] = [];

          return function(move: IGeneratedMove, score?: number): number {
               const
                    moveStr = move.pid + move.to + ((move.ppid) ? move.ppid : ''),
                    hashedIdx = movehasher(moveStr)

               if (move.pid === null) {
                    moveToScoreArray = [];
               } else if (typeof score !== undefined) {
                    moveToScoreArray[hashedIdx] = score;
               }
               return moveToScoreArray[hashedIdx];
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

          // if (this.computedMove === null || this.computedMove.pid === null) {
          //      console.log('computerMove fail');
          //      return;
          // }
          this.performComputedMove();
     }
     private isMoveAllowed = (pid: PID, drctn: DIRECTION, from: SQID, to: SQID): boolean => {
          return !(IS_KING.test(pid)
               || (IS_PAWN.test(pid)
                    && (!ORDINALS.includes(drctn)
                         || to !== Board.nextSquare(drctn, from))));
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
                    abpr = IS_KING.test(apid) ? 10 : control.getPieceWorth(apid),
                    bbpr = IS_KING.test(bpid) ? 10 : control.getPieceWorth(bpid);


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
          return b.score - a.score
     }
     private rankByHighestScore = (a, b): number => {
          // rank by lowest piece value within highest score first
          const
          control = Game.control,
               apid = a.pid,
               bpid = b.pid,
               abps = a.score + control.getPieceWorth(apid),
               bbps = b.score + control.getPieceWorth(bpid);
          if (a.score === b.score) {
               return bbps - abps;
          }
          return b.score - a.score
     }
     private promo = (pid: PID, to: SQID): PID => {
          let retpid: PID = null;
          if (IS_PAWN.test(pid)) {
               const
                    side: SIDE = pid[0] as SIDE,
                    rank = to[1];
               if (rank === '8' || rank === '1') {
                    const promPidArray: PID[] = [side + 'Q', side + 'R', side + 'B', side + 'N'];
                    let scoredMoves: IScoredMove[] = [];
                    for (const promPid of promPidArray) {
                         const score = this.squareValueReOccupy([promPid, to]);
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
               scoredMoves: IScoredMove[] = [];

          for (const pid of pids) {
               const
                    piece = control.getPiece(pid),
                    legals = piece.getLegals();

               if (!IS_KING.test(pid)) { // TODO how to counter king score 1000?
                    for (const sqid of legals) {
                         if (!piece.isPinned(sqid)) {
                              const score = this.squareValueReOccupy([pid, sqid]);
                              scoredMoves.push(
                                   { pid: pid, to: sqid, ppid: this.promo(pid, sqid), score: score }
                              );
                         }
                    }
               }
          }

          let generatedMove: IGeneratedMove = null;
          if (scoredMoves.length) {
               scoredMoves.sort(this.rankByLowestScore);
               let
                    prevScore: number,
                    bestMoves = scoredMoves.filter((move, idx) => {
                         if (prevScore === undefined) {
                              prevScore = move.score;
                         } else if (move.score < prevScore) {
                              return false;
                         }
                         return true;
                    });

               let mv = bestMoves[~~(Math.random() * bestMoves.length)];

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
                    scoredMoves.push({ pid: ipid, to: ito, ppid: this.promo(ipid, ito), score: score });
               });
          }

          kLegals.forEach((sqid) => {
               const
                    pid = control.getPid(sqid),
                    // score = (pid) ? BasicPieceRank[pid[pid.length - 1]] : 0;
                    score = (pid) ? control.getPieceWorth(pid) : 0;
               scoredMoves.push({ pid: kingPid, to: sqid, ppid: null, score: score });
          });

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
               // currentPlayer: SIDE = (lastMove ? ((lastMove[0] === 'W') ? 'B' : 'W') : control.getCurrentPlayer()) as SIDE,
               currentPlayer: SIDE = control.getCurrentPlayer(),
               lastPlayer: SIDE = currentPlayer === 'W' ? 'B' : 'W',
               kpid: PID = lastPlayer + 'K',
               kpiece: Piece = control.getPiece(kpid),
               klegals: SQID[] = kpiece.getLegals(),
               ksqid: SQID = kpiece.getSqid(),
               kattckng: PID[] = kpiece.getAttckng(),
               myPidArray: PID[] = control.getPidArray(currentPlayer),
               oppPidArray: PID[] = control.getPidArray(lastPlayer),
               enPassant: SQID = control.getEnPassant(),
               discoveredCheckMate = (movingPiece: Piece): IGeneratedMove => {
                    // console.log('discoveredCheckMate')
                    const
                         mvngPid = movingPiece.getPid(),
                         mvngLegals = movingPiece.getLegals(),
                         chkngPid: PID = movingPiece.getKShadow(),
                         chkngPiece: Piece = control.getPiece(chkngPid),
                         chkngSqid: SQID = chkngPiece.getSqid(),
                         chkngDrctn: DIRECTION = Board.getDirection(chkngSqid, ksqid),
                         squaresInDirection: SQID[] = Board.fromDirectionSquares(chkngSqid, chkngDrctn),
                         intrcptPidtos: PID_TO[] = control.interceptAlignment(kpiece, chkngSqid);

                    let scoredMoves: IScoredMove[] = []
                    // rate all intercepting moves by opponenet - for this function and wider computedMove also
                    for (const [ipid, ito] of intrcptPidtos) {
                         const
                              ippid = this.promo(ipid, ito),
                              score = this.squareValueReOccupy([ipid, ito]);
                         scoredMoves.push({ pid: ipid, to: ito, ppid: ippid, score: score });
                    }

                    // a discovery check may also need to cover some of the kings escaoe squares
                    let kingsLegals: SQID[] = klegals.filter(ds => { return !squaresInDirection.includes(ds); } );

                    if (kingsLegals.length === 0 && intrcptPidtos.length === 0) {
                         // discovered check or even double discovered check,
                         // cannot be intercepted and nowhere to run
                         // moving piece can choose any of it's legals
                         return { pid: mvngPid, to: mvngLegals[0], ppid: null };
                    }

                    // can the remaining squares be attacked by the moving piece?
                    let checkingMoves: SQID[] = [], rmmngKLegals: SQID[] = [];

                    for (const sqid of kingsLegals) {
                         const squares = Board.moveTowards(sqid, mvngLegals, movingPiece.directions);
                         if (!squares.length) {
                              rmmngKLegals.push(sqid);
                         } else {
                              checkingMoves.push(...squares);
                         }
                    }

                    if (!rmmngKLegals.length && checkingMoves.length) {
                         // all legals addressed so any move by discovering piece we found will do...
                         return { pid: mvngPid, to: checkingMoves[0], ppid: null };
                    }

                    return null;
               },
               pinCheckMate = (pinnedPiece: Piece): IGeneratedMove => {
                    // console.log('pinCheckMate');
                    for (const pnndPieceAttckrPid of pinnedPiece.getAttckrs()) {
                         const
                              pinningPid = pinnedPiece.getKPin(),
                              pinnedSqid =  pinnedPiece.getSqid();
                         let
                              chckngPiece: Piece = null,
                              chckngPid: PID = null,
                              chckngSqid: SQID = null,
                              chckngPieceAttckrs: PID[] = [],
                              pinDrctn: DIRECTION = null,
                              squaresInDirection: SQID[] = [],
                              intrcptPidtos: PID_TO[] = [],
                              mvPid: PID = null,
                              mvTo: SQID = null;

                         if (IS_PAWN.test(pnndPieceAttckrPid) && (pinnedSqid === enPassant)) {
                              mvPid = pnndPieceAttckrPid;
                              mvTo = (enPassant[0] + ((enPassant[1] === '4') ? '5' : '6')) as SQID;
                              chckngPiece = control.getPiece(pinningPid);
                              chckngPid = chckngPiece.getPid(),
                              chckngPieceAttckrs = chckngPiece.getAttckrs();
                              chckngSqid = chckngPiece.getSqid();
                              pinDrctn = Board.getDirection(chckngSqid, ksqid);
                         } else {
                              // missing: when moving piece no longer defends a piece next to opposing king!
                              mvPid = pnndPieceAttckrPid;
                              mvTo = pinnedSqid;
                              chckngPiece = control.getPiece(mvPid);
                              chckngPid = chckngPiece.getPid(),
                              chckngSqid = mvTo;
                              chckngPieceAttckrs = pinnedPiece.getDfndrs();
                              pinDrctn = Board.getDirection(mvTo, ksqid);
                         }

                         // get and use score as indicator that moving piece may be captured
                         const score = this.squareValueReOccupy([chckngPid, chckngSqid]);
                         if (score >= 0 && chckngPiece.directions.includes(pinDrctn)) {
                              squaresInDirection = Board.fromDirectionSquares(chckngSqid, pinDrctn),
                              intrcptPidtos = control.interceptAlignment(kpiece, mvTo);

                              let kls: SQID[] = klegals.filter(ds => { return !squaresInDirection.includes(ds); } );

                              if ((kls.length === 0) && (intrcptPidtos.length === 0) && (chckngPieceAttckrs.length === 0)) {
                                   // discovered check, cannot be intercepted and nowhere to run
                                   //moving piece can choose any of it's legals
                                   return { pid: mvPid, to: mvTo, ppid: null };
                              }
                         }
                    }
                    return null;
               },
               assemblePidTos = (kingAccessSquares: SQID[]): PID_TO[] => {
                    let
                         pidtos: PID_TO[] = [];
                    kingAccessSquares.forEach((sqid) => {  // for each opposing kings access squares
                         const drctn = Board.getDirection(sqid, ksqid)
                         myPidArray.forEach((pid) => { // which of my sides pieces can legally move to the access square?
                              const
                                   piece = control.getPiece(pid),
                                   isShadowedPiece = piece.isShadowing(sqid),
                                   plegals = piece.getLegals();
                              if (!IS_KING.test(pid)) {
                                   if (!isShadowedPiece) {
                                        if (plegals.includes(sqid) && piece.directions.includes(drctn)) {
                                             if (!(IS_PAWN.test(pid) && (!ORDINALS.includes(drctn) || ksqid !== Board.nextSquare(drctn, sqid)))) {
                                                  pidtos.push([pid, sqid]);
                                             }
                                        }
                                   } else {
                                        plegals.forEach(sqid => {
                                             pidtos.push([pid, sqid]);
                                        });
                                   }
                              }
                         });
                    });
                    return pidtos;
               };


          let
               generatedMove: IGeneratedMove = null,
               pidtos: PID_TO[] = [];

          for (const pid of myPidArray) {
               const piece = control.getPiece(pid);
               if (piece.getKShadow() !== null) {
                    if ((generatedMove = discoveredCheckMate(piece)) !== null) {
                         return generatedMove;
                    }
               }
          }

          for (const pid of oppPidArray) {
               const piece = control.getPiece(pid);
               if (piece.getKPin() !== null) {
                    if ((generatedMove = pinCheckMate(piece)) !== null) {
                         return generatedMove;
                    }
               }
          }

          pidtos = assemblePidTos(kpiece.getAccessors());
          for (const pidto of pidtos) {
               const score = this.squareValueReOccupy(pidto); // can our moved piece be captured?

               if (score >= 0) {
                    const
                         [pid, to] = pidto,
                         drctn: DIRECTION = Board.getDirection(to, ksqid),
                         intrcptPidtos: PID_TO[] = control.interceptAlignment(kpiece, to);

                    let
                         squaresInDirection: SQID[] = Board.fromDirectionSquares(to, drctn),
                         cpiece: Piece = control.getPiece(to),
                         enPassant: SQID = control.getEnPassant(),
                         kpin: PID;

                    const score = this.squareValueReOccupy([pid, to]);

                    // if a piece is captured...
                    if (cpiece && score <= 0) {
                         // But if defender is pinned!!!!
                         continue;    // can't be a mate in one if piece can be captured straigtaway
                    } else if (enPassant && IS_PAWN.test(pid)) {
                         const
                              eppiece = control.getPiece(enPassant),
                              rank = enPassant[1],
                              pdrctn = (rank === '4') ? DIRECTION.S : DIRECTION.N,
                              epCaptureSqid = Board.nextSquare(pdrctn, enPassant);
                         if (epCaptureSqid === to) {
                               kpin = eppiece.getKPin();
                               if (kpin) {
                                    const
                                        dscvrdPiece = control.getPiece(kpin),
                                        dscvrdSqid = dscvrdPiece.getSqid(),
                                        dir = Board.getDirection(dscvrdSqid, ksqid);
                                    if (Board.alignedWith(dscvrdSqid, dir) === kpiece) {
                                         squaresInDirection = Board.fromDirectionSquares(dscvrdSqid, dir);
                                         let kls: SQID[] = klegals.filter(ds => { return !squaresInDirection.includes(ds); } );
                                         if (kls.length === 0 && intrcptPidtos.length === 0) {
                                              // discovered check, cannot be intercepted and nowhere to run
                                              //moving piece can choose any of it's legals
                                              generatedMove = { pid: pid, to: to, ppid: null };
                                              break;
                                         }
                                    }
                               }
                         }
                    } else {
                         let
                              kls: SQID[] = klegals.filter(ds => { return !squaresInDirection.includes(ds); }),
                              revealed = this.revealedSquares(pidto);

                         kls = kls.filter(ds => { return !revealed.includes(ds); });

                         if (kls.length === 0 && intrcptPidtos.length === 0) {
                              let safe = true;
                              for (const attckdpid of kattckng) {
                                   const
                                        kattckd = control.getPiece(attckdpid),
                                        dfndrs = kattckd.getDfndrs();
                                   if (dfndrs.length === 1 && dfndrs.includes(pid)) {
                                   // the king has no legal places to go but an attacked piece may no longer be defended
                                        const d = Board.getDirection(to, kattckd.getSqid());
                                        if (Board.alignedWith(to, d) !== kattckd) { // not able to defend after move!
                                             safe = false;
                                        }
                                   }
                              }

                              if (safe) {
                                   generatedMove = { pid: pid, to: to, ppid: null };
                                   break;
                              }
                         }
                    }
               }
          }

          return generatedMove; // maybe null
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
               ep = control.getEnPassant(),
               currentPlayer: SIDE = control.getCurrentPlayer(),
               lastturn: SIDE = (currentPlayer === 'W') ? 'B' : 'W',
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
                         if (IS_PAWN.test(opid) && IS_PAWN.test(pid) && (osqid === ep)) {
                              const to: SQID = (ep[0] + ((ep[1] === '4') ? '3' : '6')) as SQID;
                              pidtos.push([pid, to]);
                         } else {
                              pidtos.push([pid, osqid]);
                         }
                    }
               });
          });

          for (const [pid, to] of pidtos) {
               const
                    ppid = this.promo(pid, to),
                    score = this.squareValueReOccupy([pid, to]);

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
                              scoredMoves.push({ pid: apid, to: msqid, ppid: this.promo(apid, msqid), score: score });
                         }
                    });
               }
          });

          let scoredMove: IScoredMove = null;
          scoredMoves.sort(this.rankByLowestScore);
          let mv = scoredMoves.length ? scoredMoves[0] : null;
          if (mv && mv.score >= 0) {
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
          // if the opponent king cannot move legally, find a way to attack it,
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
               pids: PID[] = control.getPidArray(currentPlayer);

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
                                        // eliminate where direction from 'to' square to attacked king is not available for attacking piece
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
               scoredMoves.sort(this.rankByLowestScore);
               let mv = scoredMoves[0];
               if (mv.score >= 0) { // must be some advantage
                    computedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
               }
          }
          return computedMove;
     }
     private defendPieceOnSqid = ([apid, to]: PID_TO): IScoredMove => {
          // console.log(' entered defendPieceOnSqid');
          const
               control = Game.control,
               attackedPid = control.getPid(to),
               attackedPiece = control.getPiece(attackedPid),
               legals: SQID[] = attackedPiece.getLegals(),
               attackedAttckrs: PID[] = attackedPiece.getAttckrs(),
               ep = control.getEnPassant();

          let scoredMoves: IScoredMove[] = [];

          if (attackedAttckrs.length === 1) {
               const
                    attckrPiece = control.getPiece(apid),
                    attckrAttckrs = attckrPiece.getAttckrs(),
                    intrcptPidtos = // cannot be intercepted if attacking piece is a Knight
                         !IS_KNIGHT.test(apid) ? control.interceptAlignment(attackedPiece, attckrPiece.getSqid()) : [];

               attckrAttckrs.forEach((ccpid) => {
                    const ccpiece = control.getPiece(ccpid);
                    let captureSqid: SQID = null;
                    if (IS_PAWN.test(ccpid) && ep) {
                         captureSqid = (ep[0] + ((ep[1] === '4') ? '3' : '6')) as SQID;
                    }
                    const ccto = (captureSqid && ccpiece.getLegals().includes(captureSqid)) ? captureSqid : attckrPiece.getSqid();
                    if (ccpiece.isPinned(ccto)) { return; }
                    let score = this.squareValueReOccupy([ccpid, ccto]);

                    scoredMoves.push({ pid: ccpid, to: ccto, ppid: this.promo(ccpid, ccto), score: score });
               });

               intrcptPidtos.forEach((pidto) => {
                    const
                         [ipid, ito] = pidto,
                         intrcptPiece = control.getPiece(ipid);
                    if (intrcptPiece.isPinned(ito)) { return; }
                    const score = this.squareValueReOccupy([ipid, ito]);
                    scoredMoves.push({ pid: ipid, to: ito, ppid: this.promo(ipid, ito), score: score });
               });
          }

          legals.forEach((sqid) => {
               const pid = control.getPid(sqid);

               if (pid && pid === apid) { return; } // already catered for in attckrAttckrs iteration above

               if (attackedPiece.isPinned(sqid)) { return; }
               const score = this.squareValueReOccupy([attackedPid, sqid]);
               scoredMoves.push({ pid: attackedPid, to: sqid, ppid: null, score: score });
          });

          scoredMoves.sort(this.rankByLowestScore);
          let mv = scoredMoves.length ? scoredMoves[0] : null;
          if (mv && mv.score >= 0) {
               // defend against highest scored attack
               // either move out of attack, take attacking piece or intercept the attack
               return mv;
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

               scoredMoves.sort(this.rankByLowestScore);
          }

          return scoredMoves.length ? scoredMoves[0] : null;
     }
     squareValueReOccupy = ([mpid, mto]: PID_TO): number => {
          const
               control = Game.control,
               mpiece = control.getPiece(mpid);

          if (mpiece && mpiece.isPinned(mto)) {
               return -1000; // move not allowed
          }

          let retScore: number;
          if ((retScore = this.moveScorer({pid: mpid, to: mto, ppid: null })) !== undefined) {
               return retScore;
          }
          const
               myside: SIDE = mpid[0] as SIDE,
               mpRank: number = control.getPieceWorth(mpid),
               cpid = control.getPid(mto), // pid of a captured piece
               cpRank: number = cpid ? control.getPieceWorth(cpid) : 0;

          let
               [whites, blacks] = control.squareExchangers([mpid, mto]),
               [mattckrs, odfndrs] = (myside === 'W') ? [whites, blacks] : [blacks, whites]; // my attackers, opposing defenders

          mattckrs = mattckrs.filter(pid => { return pid !== mpid; });

          if (IS_KING.test(mpid) && odfndrs.length) {
               if (odfndrs.length === 1 && control.getPiece(odfndrs[0]).isPinned(mto)) {
                    odfndrs.length = 0;
               } else {
                    retScore = -mpRank;
                    this.moveScorer({pid: mpid, to: mto, ppid: null }, retScore);
                    return retScore;
               }
          };

          const
               mattckrsWithRank = this.sortPidsAndRank(mattckrs),
               odfndrsWithRank = this.sortPidsAndRank(odfndrs);

          mattckrsWithRank.unshift([mpid, mpRank]); // put moving piece to front of moves

          let
               mattckrScore: number = 0,
               odfndrScore: number = 0,
               myMove = true,
               tempRank: number = cpRank,
               shifted: [PID, number];

          while (shifted = myMove ? mattckrsWithRank.shift() : odfndrsWithRank.shift()) {
               const
                    [pid, rank] = shifted,
                    oppExchanger = myMove
                         ? (odfndrsWithRank.length ? true : false)
                         : (mattckrsWithRank.length ? true : false);

               if (IS_KING.test(pid) && oppExchanger) { break; }

               myMove ? mattckrScore += tempRank : odfndrScore += tempRank;

               tempRank = rank;
               myMove = !myMove;

               if (!myMove && (odfndrScore > mattckrScore)) {
                    retScore = mattckrScore - odfndrScore;
                    this.moveScorer({pid: mpid, to: mto, ppid: null }, retScore);
                    return retScore;
               }
          }

          retScore = (mattckrScore >= odfndrScore) ? mattckrScore - odfndrScore : -(odfndrScore - mattckrScore);
          this.moveScorer({pid: mpid, to: mto, ppid: null }, retScore);
          return retScore;
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
     private deliverCheck = (): IGeneratedMove => {
          // console.log(' entered deliverCheck');
          const
               control = Game.control,
               currentPlayer: SIDE = control.getCurrentPlayer(),
               oppPlayer: SIDE = currentPlayer === 'W' ? 'B' : 'W',
               kpid: PID = oppPlayer + 'K',
               kpiece: Piece = control.getPiece(kpid),
               ksqid: SQID = kpiece.getSqid(),
               kaccesSqrs: SQID[] = kpiece.getAccessors(),
               pidArray: PID[] = control.getPidArray(currentPlayer);

          let
               // pidtos: PID_TO[] = [],
               pidtos: string[] = [],
               scoredMoves: IScoredMove[] = [];


          kaccesSqrs.forEach((sqid) => {  // for each opposing kings access squares
               const drctn = Board.getDirection(sqid, ksqid)
               pidArray.forEach((pid) => { // which of my sides pieces can legally move to the access square?
                    const
                         piece = control.getPiece(pid),
                         isShadowedPiece = piece.isShadowing(sqid),
                         plegals = piece.getLegals();
                    if (!IS_KING.test(pid)) {
                         if (!isShadowedPiece) {
                              if (plegals.includes(sqid) && piece.directions.includes(drctn)) {
                                   if (!(IS_PAWN.test(pid) && (!ORDINALS.includes(drctn) || ksqid !== Board.nextSquare(drctn, sqid)))) {
                                        const strfyPidTo = JSON.stringify([pid, sqid]);
                                        pidtos.push(strfyPidTo);
                                   }
                              }
                         } else {
                              plegals.forEach(sq => {
                                   const pidto = JSON.stringify([pid, sq]);
                                   if (!pidtos.includes(pidto)) {
                                        pidtos.push(pidto);
                                   }
                              });
                         }
                    }
               });
          });


          pidtos.forEach((pidto) => {
               const
                    [pid, to] = JSON.parse(pidto),
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
               scoredMoves.sort(this.rankByLowestScore);
               let mv = scoredMoves[0];
               if (mv.score >= 0) { // must be some advantage
                    generatedMove = { pid: mv.pid, to: mv.to, ppid: mv.ppid };
               }
          }
          return generatedMove;
     }
     // private computeRandomMove = (): void => {
     //      // console.log(' entered computeRandomMove');
     //      const
     //           control = this.control,
     //           pids: PID[] = control.getPidArray(Game.nextTurn)
     //
     //      let
     //           nextMove: IGeneratedMove = { pid: null, to: null, ppid: null },
     //           mpid: PID,
     //           mpiece: Piece,
     //           mlegals: SQID[],
     //           mto: SQID;
     //
     //      while (true) {
     //           if (pids.length) {
     //                mpid = pids[~~(Math.random() * pids.length)];
     //                mpiece = control.getPiece(mpid);
     //                mlegals = mpiece.getLegals();
     //
     //                if (mlegals.length) {
     //                     nextMove.pid = mpid;
     //                     break;
     //                } else {
     //                     pids.splice(pids.indexOf(mpid), 1);
     //                }
     //           } else {
     //                console.log('zugzwang??');
     //           }
     //      }
     //
     //      mto = mlegals[~~(Math.random() * mlegals.length)];
     //
     //      nextMove.to = mto;
     //      nextMove.ppid = this.promo(mpid, mto);
     //
     //      this.computedMove = nextMove;
     // }
}
