import { IPosition, IDeconMove, DIRECTION, DIRECTION_GROUP, ALL_DIRECTIONS, HALF_WINDS, CARDINALS, ORDINALS } from "./Model";
import { FILES, PID, SIDE, SQID, PID_TO, PID_TO_ONTO, PID_WITH_RANK, SQUARE } from './Model';
import { ALGB_MOVE, IS_PHASE_ONE_PROMO, IS_PID, BasicPieceRank } from './Model';
import { IS_KING, IS_QUEEN, IS_ROOK, IS_BISHOP, IS_KNIGHT, IS_PAWN } from './Model';
import { Board } from "./Board";
import { Knight } from "./Knight";
import { Pawn } from "./Pawn";
import { Rook } from "./Rook";
import { Bishop } from "./Bishop";
import { Piece } from "./Piece";
import { Queen } from "./Queen";
import { King } from "./King";

export class GameControl {
     static initialPiecePositions = {
          'WQR': 'a1',
          'WQN': 'b1',
          'WQB': 'c1',
          'WQ': 'd1',
          'WK': 'e1',
          'WKB': 'f1',
          'WKN': 'g1',
          'WKR': 'h1',

          'WQRP': 'a2',
          'WQNP': 'b2',
          'WQBP': 'c2',
          'WQP': 'd2',
          'WKP': 'e2',
          'WKBP': 'f2',
          'WKNP': 'g2',
          'WKRP': 'h2',

          'BQR': 'a8',
          'BQN': 'b8',
          'BQB': 'c8',
          'BQ': 'd8',
          'BK': 'e8',
          'BKB': 'f8',
          'BKN': 'g8',
          'BKR': 'h8',

          'BQRP': 'a7',
          'BQNP': 'b7',
          'BQBP': 'c7',
          'BQP': 'd7',
          'BKP': 'e7',
          'BKBP': 'f7',
          'BKNP': 'g7',
          'BKRP': 'h7',
     };

     static createPiece = (pid: PID, sqid: SQID): Piece => {
          // const p = pid[pid.length - 1];
          return IS_PAWN.test(pid) ? new Pawn(sqid, pid)
               : IS_KNIGHT.test(pid) ? new Knight(sqid, pid)
                    : IS_BISHOP.test(pid) ? new Bishop(sqid, pid)
                         : IS_ROOK.test(pid) ? new Rook(sqid, pid)
                              : IS_QUEEN.test(pid) ? new Queen(sqid, pid)
                                   : new King(sqid, pid);
     };
     static removeFromPieceData = (pids: PID[], pid: PID): PID[] => {
          const idx = pids.indexOf(pid);
          if (idx > -1) {
               pids = pids.splice(idx, 1);
          }
          return pids
     };
     static addToPositionalData = (pids: PID[], pid: PID): PID[] => {
          const idx = pids.indexOf(pid);
          if (idx === -1) {
               pids.push(pid);
          }
          return pids
     }
     getEnPassant = (): SQID => {
          return this.enPassant;
     };
     setEnPassant = (sqid: SQID): void => {
          this.enPassant = sqid;
     };
     getPromotion = (): SQID => {
          return this.promotion;
     };
     setPromotion = (sqid: SQID): void => {
          this.promotion = sqid;
     };
     getPid = (sqid: SQID): PID | null => {
          return this.sqidsToPids[sqid];
     };
     getPiece = (id: PID | SQID): Piece => {
          let
               piece: Piece;

          if (id in SQUARE) {
               id = this.sqidsToPids[id];
          }
          piece = this.pieces[id];
          return piece || null;
     };
     getSquares = () => {
          return this.sqidsToPids;
     };
     clonePieces = () => {
          let pieces = {};
          Object.keys(this.pieces).filter(key => {
               const piece: Piece = this.pieces[key],
                    sqid = piece.getSqid(),
                    pid = key as PID;
               pieces[pid] = GameControl.createPiece(pid, sqid);
          });
          return pieces;
     };
     assemblePieceData = () => {
          Object.keys(this.pieces).filter(pid => {
               if (!IS_KING.test(pid)) {
                    const piece: Piece = this.pieces[pid];
                    piece.updatePositionalData();
               }
          });

          for (const kpid of ['BK', 'WK']) {
               const king: King = this.getPiece(kpid) as King;
               king.markPins();
               king.markShadows();
               king.updatePositionalData();
          }
     }
     getCaptures = (): PID[] => {
          return this.captures;
     };

     selfCheck = (fromsqid: SQID, tosqid: SQID): boolean => {
          // if piece on fromsqid is moved will there be discovered check?
          // if piece moves to tosqid will it's king be in check?
          const
               oppside: SIDE = ((this.currentPlayer === 'W') ? 'B' : 'W') as SIDE,
               kpid: PID = ((this.currentPlayer === 'W') ? 'WK' : 'BK') as PID,
               king: Piece = this.getPiece(kpid),
               ksqid: SQID = king.getSqid(),
               movingpiece: Piece = this.getPiece(fromsqid),
               drctnToKing: DIRECTION = Board.getDirection(ksqid, tosqid),
               drctnFromKing: DIRECTION = Board.getDirection(ksqid, fromsqid),
               ap: Piece = Board.alignedWith(ksqid, drctnFromKing);

          if (ap && ap.getSqid() === fromsqid) {
               const revealedPiece: Piece = Board.alignedWith(fromsqid, drctnFromKing);
               if (revealedPiece && revealedPiece.getSide() !== king.getSide()) {
                    // check direction correspondence of revealed piece - what about knights!!
                    if (revealedPiece.directions.includes(drctnFromKing)) {
                         if (!(revealedPiece instanceof King) && !(revealedPiece instanceof Knight)) {
                              if (movingpiece instanceof Knight) { // the knight always moves off a straight direction
                                   return true;
                              } else if (drctnToKing === null || drctnToKing !== drctnFromKing) {
                                   return true;
                              }
                         }
                    }
               }
          } else if (movingpiece instanceof King) {
               if (this.checkedBy(tosqid, oppside).length > 0) {
                    return true;
               } else if (movingpiece.moved) {
                    const
                         ff = FILES.indexOf(fromsqid[0]),
                         tf = FILES.indexOf(tosqid[0]);
                    if (Math.abs(ff - tf) === 2) {
                         // castling
                         const rsqid = (oppside === 'W')
                              ? (tosqid[0] === 'g') ? 'f8' : 'd8'
                              : (tosqid[0] === 'g') ? 'f1' : 'd1';
                         if (this.checkedBy(rsqid, oppside).length > 0) {
                              return true;
                         }
                    }
               }
          }
          return false;
     };
     escapesCheck = (fromsqid: SQID, tosqid: SQID): boolean => {
          const
               movingpiece = this.getPiece(fromsqid),
               mvngside = movingpiece.getSide(),
               oppside = (mvngside === 'W') ? 'B' : 'W',
               myKingPid = ((mvngside === 'W') ? 'WK' : 'BK') as PID,
               myKing = this.getPiece(myKingPid),
               checkers: PID[] = myKing.getAttckrs(),
               myKingSqid = myKing.getSqid();

          if (checkers.length === 0) {
               return true;
          } else if (movingpiece instanceof King) {
               const cb = this.checkedBy(tosqid, oppside);
               if (cb.length > 0) {
                    return false;
               }
               return true;
          } else {
               for (const chkr of checkers) {
                    const chkrSqid = this.getPiece(chkr).getSqid();
                    if (Board.intercepts(tosqid, chkrSqid, myKingSqid)) {
                         return true;
                    }
               }
          }

          return false;
     };
     checkedBy = (target: SQID, checkingSide: SIDE): Piece[] => {
          const
               pieceBuffer: Piece[] = [];
          for (const drctn of ALL_DIRECTIONS) {
               let
                    sqid: SQID = target,
                    firstStep = true;

               while (sqid = Board.nextSquare(drctn, sqid)) {
                    const
                         pid = this.getPid(sqid),
                         piece = this.getPiece(pid);

                    if (piece) {
                         if (checkingSide === piece.getSide()) {
                              const directionGroup = Board.getDirectionGroup(drctn);
                              if (directionGroup === DIRECTION_GROUP.ORDINAL) {
                                   if (piece instanceof Queen || piece instanceof Bishop) {
                                        pieceBuffer.push(piece);
                                   } else if (firstStep) {
                                        if (piece instanceof King) {
                                             pieceBuffer.push(piece);
                                        } else if (piece instanceof Pawn) {
                                             let pawnAttack: boolean =
                                                  (checkingSide === 'W')
                                                       ? (drctn === DIRECTION.NE || drctn === DIRECTION.NW)
                                                       : (drctn === DIRECTION.SE || drctn === DIRECTION.SW);

                                             if (!pawnAttack) {
                                                  pieceBuffer.push(piece);
                                             }
                                        }
                                   }
                              } else if (directionGroup === DIRECTION_GROUP.CARDINAL) {
                                   if (firstStep && piece instanceof King) {
                                        pieceBuffer.push(piece);
                                   } else if (piece instanceof Queen || piece instanceof Rook) {
                                        pieceBuffer.push(piece);
                                   }
                              } else { /* HALF_WIND */
                                   if (firstStep && piece instanceof Knight) {
                                        pieceBuffer.push(piece);
                                   }
                              }
                         } else if (piece instanceof King) {
                              // consider King of non-checking side to be transparent
                              if (firstStep) {
                                   firstStep = false;
                              }
                              continue;
                         }
                         break;
                    }

                    if (firstStep) {
                         firstStep = false;
                    }
               }
          }
          return pieceBuffer;
     };
     isCheckMatePreMove = (king: King, nextMove?: PID_TO_ONTO): boolean => {
          // should only be called when king is checked, therefore must be one or two attackers
          // if nextmove is present then the assessment is pre-move, else the assessment
          // is post-move and the 'nextMove' parameter unnecessary
          const
               [ mpid, mto, monto ] = nextMove,
               kpid = king.getPid(),
               ksqid = king.getSqid(),
               mpiece: Piece = this.getPiece(mpid),
               checkdrctn: DIRECTION = Board.getDirection(monto, ksqid),
               mcheck: boolean = (Board.alignedWith(monto, checkdrctn) === king),
               shadowedPid: PID = mpiece ? mpiece.getKShadow() : null, // promoting pawn dissappears
               sPiece = shadowedPid ? this.getPiece(shadowedPid) : null,
               ssqid  = shadowedPid ? sPiece.getSqid(): null,
               cpid = this.sqidsToPids[monto]; // newMove may include a capture

          let
               csqid: SQID = null, // later used for single check sqid
               klegals = king.getLegals(),
               scheck: boolean = false; // shadowed piece delivers check?

          if (klegals.length) {
               const
                    mtoKingSqids = Board.fromDirectionSquares(monto, checkdrctn),
                    shadowDrctn: DIRECTION = Board.getDirection(mto, ksqid);

               klegals = klegals.filter(lgl => { return !mtoKingSqids.includes(lgl); } );

               if (shadowedPid && checkdrctn !== shadowDrctn) { // shadowed piece exposed so must be checked
                    scheck = true;
                    const mfromSqids = Board.fromDirectionSquares(mto, shadowDrctn);
                    klegals = klegals.filter(lgls => { return !mfromSqids.includes(lgls); } );
               }

               if (klegals.length) {
                    return false; // not mate because king can still move
               } else if (mcheck && scheck) {
                    return true; // mate because king cannot move and double check
               }

          }

          // check from a single piece - from which square?
          csqid = mcheck ? monto : ssqid;

          // at this point we know king can't move and only a single check on king
          // so can checking piece be taken ?
          const
               checkedPlayer = this.currentPlayer === 'W' ? 'B' : 'W',
               oppPidArray: PID[] = this.getPidArray(checkedPlayer);
          for (const opid of oppPidArray) {
               if (opid !== cpid) { // not a captured piece
                    const
                         opiece = this.getPiece(opid),
                         olegals = opiece.getLegals();
                    if (olegals.includes(csqid)) { // sinlge checking piece can be captured
                         if (IS_PAWN.test(opid) && (opiece.getSqid()[0] === monto[0])) {
                              continue;
                         }
                         return false; // not mate
                    }
               }
          }

          // finally can the check be intercepter?
          const
               isqids: SQID[] = Board.betweenSquares(csqid, ksqid);
          for (const ipid of oppPidArray) {
               if (ipid !== cpid && !IS_KING.test(ipid)) { // not a captured piece or the checked king
                    const
                         ipiece = this.getPiece(ipid),
                         ilegals = ipiece.getLegals();
                    for (const ilsqid of ilegals) {
                         if (isqids.includes(ilsqid)) {
                              if (IS_PAWN.test(ipid) && (ipiece.getSqid()[0] === monto[0])) {
                                   continue;
                              }
                              return false; // not mate
                         }
                    }
               }
          }

          // check piece untakeable and can't be intercepted
          return true; // mate
     }
     isCheckMatePostMove = (king: King): boolean => {
          // should only be called when king is checked, therefore must be one or two attackers
          // if nextmove is present then the assessment is pre-move, else the assessment
          // is post-move and the 'nextMove' parameter unnecessary
          const
               kpid = king.getPid(),
               attackers = king.getAttckrs(),
               klegals = king.getLegals();

          if (klegals.length) {
               return false;
          }

          let isMate = true;
          if (attackers.length === 1) { // if 2 checkers and king trapped then is definitely checkmate
               // must be at least one king attacker otherwise not check
               const
                    attckngPid: PID = attackers[0],
                    attckngPiece = this.getPiece(attckngPid),
                    attckngPieceAttckrs = attckngPiece.getAttckrs();

               if (attckngPieceAttckrs.includes(kpid)) {
                    // we know that if king is attacking it can't legally do so since klegals is empty
                    const kidx = attckngPieceAttckrs.indexOf(kpid);
                    attckngPieceAttckrs.splice(kidx, 1);
               }

               if (this.interceptAlignment(king, attckngPiece.getSqid()).length) {
                    isMate = false;
               } else if (attckngPieceAttckrs.length) {
                    isMate = false;
               }
          }

          // if (isMate) { console.log('mate detected'); }
          return isMate;
     }
     pieceTakers = (tkblPid: PID): PID[] => {
          // which pieces can capture the piece of tkblPid?
          const
               tkblSide = tkblPid[0],
               oppSide = (tkblSide === 'W') ? 'B' : 'W',
               defended = this.getPiece(tkblPid).getDfndrs().length ? true : false,
               oppPidArray: PID[] = this.getPidArray(oppSide);

          let tkrPids: PID[] = [];
          for (let idx = 0; idx < oppPidArray.length; idx += 1) {
               const
                    pid: PID = oppPidArray[idx],
                    piece: Piece = this.getPiece(pid),
                    attckng: PID[] = piece.getAttckng();

               if (attckng.includes(tkblPid)) {
                    if (IS_KING.test(pid) && defended) {
                         // if attacking piece is a king but takeable piece is defended then skip
                         continue;
                    } else {
                         tkrPids.push(pid);
                    }
               }
          }
          return tkrPids;
     }
     squareExchangers = ([mpid, mto]: PID_TO, promoted?: boolean): [PID, number][][] => {
          // all other pieces that can move to this square but excluding pieces behind directly
          if (mpid === 'BQ' && mto === 'e6') {
               console.log('newSquareExchangers');
          }

          promoted = promoted ? promoted : false;

          const
               mpiece = this.getPiece(mpid),
               msqid = promoted ? mto : (mpiece ? mpiece.getSqid() : mto); // piece is moving from here
          let
               whitePids: PID[] = [],
               blackPids: PID[] = [],
               pidsByDirection: PID[][] = [];
          for (const drctn of ALL_DIRECTIONS) {
               let
                    sq = mto;
               pidsByDirection[drctn] = [];
               while (sq = Board.nextSquare(drctn, sq)) {
                    const epiece = this.getPiece(sq); // exchanger piece
                    if (epiece) {
                         const epid = epiece.getPid();
                         if (epid !== mpid) {
                              const kpPid = epiece.getKPin();
                              if (kpPid) {
                                   const
                                        oppside = (kpPid[0] === 'W') ? 'B' : 'W',
                                        oppkpid = oppside + 'K' as PID,
                                        oppking = this.getPiece(oppkpid),
                                        oppksqid = oppking.getSqid(),
                                        kppiece = this.getPiece(kpPid),
                                        kpsqid = kppiece.getSqid(),
                                        pinDrctn = Board.getDirection(kpsqid, oppksqid);
                                   if (pinDrctn === Board.getDirection(mto, oppksqid)) {
                                   // the pinning piece moves and abandons the pin ?
                                        const
                                             apiece = Board.alignedWith(msqid, pinDrctn),
                                             apid = apiece ? apiece.getPid() : null;
                                        if (apid && (apid[0] !== oppside) && (apiece.directions.includes(pinDrctn))) {
                                             continue;
                                        }
                                   }
                                   else if (kpPid !== mpid) {
                                        continue
                                   }
                              }

                              if (IS_PAWN.test(epid)) {
                                   const pdrctn = Board.getDirection(sq, mto);
                                   if (ORDINALS.includes(pdrctn)
                                        && epiece.directions.includes(pdrctn)
                                             && (mto === Board.nextSquare(pdrctn, sq))) {
                                        (epid[0] === 'W') ? whitePids.push(epid) : blackPids.push(epid);
                                        pidsByDirection[drctn].push(epid);
                                        continue;
                                   }
                              } else if (epiece.directions.includes(drctn)) {
                                   if (IS_KING.test(epid) && !(sq === Board.nextSquare(drctn, mto))) {
                                        break; // king must be one square away to exhange
                                   }
                                   (epid[0] === 'W') ? whitePids.push(epid) : blackPids.push(epid);
                                   pidsByDirection[drctn].push(epid);
                                   continue;
                              }
                         }
                         break;
                    }

                    if (HALF_WINDS.includes(drctn)) {
                         break;
                    }
               }
          }

          const orderExchangerPids = (pidsByDirection: PID[][]): PID_WITH_RANK[][] => {
               const organisedPids: PID_WITH_RANK[][] = [];
               for (const d of ALL_DIRECTIONS) {
                    // remove empty array elements
                    if (pidsByDirection[d].length === 0) {
                         delete pidsByDirection[d];
                    } else {
                         const pid: PID = pidsByDirection[d][0];
                         let pidWithRank: PID_WITH_RANK = [pid, this.getPieceWorth(pid)];
                         if (!organisedPids[d]) {
                              organisedPids[d] = [];
                         }
                         organisedPids[d].push(pidWithRank);
                    }
               }
               return organisedPids;
          };
          const pidsWithRankByDirection: [PID, number][][] = orderExchangerPids(pidsByDirection);
          return pidsWithRankByDirection;
     }
     interceptAlignment = (attacked: Piece, attckngSqid: SQID): PID_TO[] => {
          const
               attackedPid = attacked.getPid(),
               attackedSide = attackedPid[0] as SIDE,
               attckdsideKingPid = attackedSide + 'K',
               betweens: SQID[] = Board.betweenSquares(attacked.getSqid(), attckngSqid);

          if (betweens.length === 0) {
               return [];
          }

          let
               pidToArray: PID_TO[] = [],
               attackedPidArray = this.getPidArray(attackedSide),
               idx = attackedPidArray.indexOf(attckdsideKingPid);

          attackedPidArray.splice(idx, 1); //remove king from array

          for (let idx = 0; idx < attackedPidArray.length; idx += 1) {
               const
                    pid: PID = attackedPidArray[idx],
                    piece: Piece = this.getPiece(pid),
                    legals: SQID[] = piece.getLegals();

               if (pid !== attackedPid) {
                    betweens.map(sq => {
                         if (legals.includes(sq)) {
                              pidToArray.push([pid, sq]);
                         }
                    });
               }
          }
          return pidToArray;
     }
     processAlgebraicMove = (move: string): IPosition => {
          const {
                    castling, ep, epsquare, capture, promoPhaseOne, promo,
                    mpid, mpiece, mfrom, mto, mdrctn,
                    rpid, rpiece, rfrom, rto
               } = this.deconstructMove(move),
               postMoveProcessing = (): void => {
                    const
                         currentPlayer = this.currentPlayer,
                         oppkpid = (currentPlayer === 'W') ? 'BK' : 'WK',
                         oppking = this.getPiece(oppkpid),
                         checked = oppking.getAttckrs().length > 0;


                    if (checked) {
                         const
                              mate = this.isCheckMatePostMove(oppking as King),
                              result = currentPlayer === 'W' ? '0-1' : '1-0';
                         move += mate ? '#' : '+';
                    }
               };

          if (mfrom === mto) { // must be promotion phase 2
               promo && this.capture(mpid);
               promo && this.promote(promo, mto);
          } else {
               capture && this.capture(mto);
               ep && this.capture(epsquare, epsquare);

               mpiece.setSqid(mto);
               mpiece.auxiliaryAction(mto, this);

               this.sqidUpdateArray.push(mfrom);
               this.sqidUpdateArray.push(mto);

               if (castling) {
                    rpiece.setSqid(rto);
                    mpiece.auxiliaryAction(rto, this);
                    this.sqidUpdateArray.push(rfrom);
                    this.sqidUpdateArray.push(rto);
               }
          }

          this.assembleSquares();

          if (!(IS_PHASE_ONE_PROMO.test(move))) { // not a 2 phase move
               this.updateData();
               postMoveProcessing();
               this.currentPlayer = (this.currentPlayer === 'W') ? 'B' : 'W';
          }

          const prevMove = this.moves[this.moves.length - 1] || null;
          if (IS_PHASE_ONE_PROMO.test(prevMove)) {
               this.moves[this.moves.length - 1] = move;
          } else {
               this.moves.push(move);
          }

          if (move.endsWith('#')) {
               this.moves.push((move[0] === 'W') ? '1-0' : '0-1');
          }
          // this.assembleSquares();
          return {
               moves: this.moves,
               sqidsToPids: this.sqidsToPids
          };
     }
     public updateData = (): void => {
          let pids: PID[] = []; // allows do kings for pin data
          this.sqidUpdateArray.forEach(sq => {
               let mpid = this.getPid(sq); // pid of moving piece
               mpid && !pids.includes(mpid) && pids.push(mpid);
               for (const drctn of ALL_DIRECTIONS) {
                    let sqid: SQID = sq;
                    while (sqid = Board.nextSquare(drctn, sqid)) {
                         let pid = this.getPid(sqid);
                         if (pid) {
                              !pids.includes(pid) && pids.push(pid);
                         } else if (HALF_WINDS.includes(drctn)) {
                              break;
                         }
                    }
               }
          });
          this.assemblePieceData();
          this.sqidUpdateArray = [];
     }
     public getPidArray = (side: SIDE): PID[] => {
          let arr: PID[] = [];
          Object.keys(this.pieces).filter(pid => {
               pid.startsWith(side) && arr.push(pid);
          });
          return arr;
     };
     public getPieceWorth = (pid: PID): number => {
          const
               piecetype = pid[pid.length - 1],
               piece = this.getPiece(pid),
               sqid = piece ? piece.getSqid() : null,
               rank = sqid ? parseInt(sqid[1]) : 0;

          let
               score: number = parseInt(BasicPieceRank[piecetype]);

          score = IS_PAWN.test(pid)
                    ? pid[0] === 'W'
                         ? rank
                         : 8 - rank
                    : score;
          return score;
     };
     public setCurrentPlayer = (player: SIDE): void => {
          this.currentPlayer = player;
     }
     public getCurrentPlayer = (): SIDE => {
          return this.currentPlayer;
     }
     public getMoves =(): string[] => { return this.moves; }

     private pieces: { [key in PID]: Piece } = null; // hash PID to Pieces
     private sqidsToPids: { [key in SQID]: PID } = null; // hash SQID to PID
     private captures: PID[] = [];
     private enPassant: SQID = null;
     private promotion: SQID = null;
     private sqidUpdateArray: SQID[] = [];
     private currentPlayer: SIDE = null;
     private moves: string[] = [];

     private assembleSquares = () => {
          let squares = {};
          Object.keys(SQUARE).filter(key => {
               if (!isNaN(Number(SQUARE[key]))) {
                    squares[key] = null;
               }
          });
          Object.keys(this.pieces).filter(pid => {
               const
                    p: Piece = this.getPiece(pid),
                    sqid = p.getSqid();
               squares[sqid] = pid;
          });
          this.sqidsToPids = squares as { [key in SQID]: PID | null };
     };
     private deconstructMove = (move: string): IDeconMove => {
          const
               pieces = this.pieces,
               algbMatch = move.match(ALGB_MOVE),
               castling = (algbMatch[1] === 'O'),
               capture = ((algbMatch[2] && algbMatch[2] === 'x') || false),
               ep = ((algbMatch[4] && algbMatch[4] === 'ep') || false),
               promoPhaseOne = ((algbMatch[4] && algbMatch[4] === '=') || false),
               promo = (algbMatch[5] && algbMatch[5] !== 'O') ? algbMatch[5] : null,
               mpid = (castling) ? (this.currentPlayer === 'W') ? 'WK' : 'BK' : algbMatch[1],
               mpiece = pieces[mpid],
               mfrom = mpiece.getSqid(),
               mto = (castling)
                         ? (algbMatch[5] && algbMatch[5] === 'O')
                              ? (this.currentPlayer === 'W')
                                   ? 'c1'
                                   : 'c8'
                              : (this.currentPlayer === 'W')
                                   ? 'g1'
                                   : 'g8'
                         : algbMatch[3] as SQID,
               epsquare = ep
                              ? mto[0] + mfrom[1]
                              : null,
               mdrctn = Board.getDirection(mfrom, mto),
               rpid = castling
                         ? ((mto[0] === 'g')
                              ? ((mto[1] === '1')
                                   ? 'WKR'
                                   : 'BKR')
                              : ((mto[1] === '1')
                                   ? 'WQR'
                                   : 'BQR'))
                         : null,
               rpiece = castling
                         ? pieces[rpid]
                         : null,
               rfrom = castling
                         ? rpiece.getSqid()
                              : null,
               rto = castling
                         ? ((rpid[0] === 'W')
                              ? ((rpid[1] === 'K')
                                   ? 'f1'
                                   : 'd1')
                              : ((rpid[1] === 'K')
                                   ? 'f8'
                                   : 'd8'))
                         : null;

          return {
               castling: castling,
               ep: ep,
               epsquare: epsquare,
               capture: capture,
               promoPhaseOne: promoPhaseOne,
               promo: promo,
               mpid: mpid,
               mpiece: mpiece,
               mfrom: mfrom,
               mto: mto,
               mdrctn: mdrctn,
               rpid: rpid,
               rpiece: rpiece,
               rfrom: rfrom,
               rto: rto
          } as IDeconMove;
     }
     private promote = (pid: PID, sqid: SQID): void => {
          const promotedPiece = GameControl.createPiece(pid, sqid);
          this.pieces[pid] = promotedPiece;
          this.promotion = null;
     };
     private capture = (id: PID | SQID, ep: SQID = null): void => {
          const
               pid = (id in SQUARE) ? this.sqidsToPids[id] : id,
               p = this.getPiece(pid),
               sq = p.getSqid();
          delete this.pieces[pid];
          if (ep) { this.sqidUpdateArray.push(sq); }
          this.captures.push(pid);
     };
     constructor(piecePositions: { [key in PID]: SQID; } | null) {

          function targetConstructor(position) { /* empty dummy */ }

          const boardProxy = new Proxy(targetConstructor, {
               construct(target, args, newtarget) {
                    let
                         trgt = {},
                         position = args[0];

                    Object.keys(position).filter(key => {
                         const
                              pid = key as PID,
                              sqid = position[pid];

                         trgt[pid] = GameControl.createPiece(pid, sqid);
                    });

                    return new Proxy(trgt, {
                         defineProperty: function(target, propKey, definition) {
                              // console.log('enter defineProperty trap');
                              if (typeof propKey === 'string' && IS_PID.test(propKey)) {
                                   // console.log('DEFINEPROPERTY: ' + propKey.toString());
                                   return Reflect.defineProperty(target, propKey, definition);
                              }
                         },
                         getOwnPropertyDescriptor: function(target, propKey) {
                              // console.log('enter getOwnPropertyDescriptor trap');
                              if (typeof propKey === 'string' && IS_PID.test(propKey)) {
                                   // console.log('GETOWNPROPERTYDESCRIPTOR: ' + propKey.toString())
                                   return Reflect.getOwnPropertyDescriptor(target, propKey);
                              }
                         }
                    });
               },
          });

          const boardProxyInstance = new boardProxy(piecePositions ? piecePositions : GameControl.initialPiecePositions);

          const metahandler = {
               get: function(dummyTarget, trapName) {
                    // console.log('Trap called : ' + trapName);
                    return Reflect[trapName];
               }
          };
          this.pieces = new Proxy(boardProxyInstance, new Proxy({}, metahandler));
          this.moves = [];
          this.assembleSquares();
     }
}
