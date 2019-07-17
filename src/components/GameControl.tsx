import { IPosition, IDeconMove, DIRECTION, DIRECTION_GROUP, ALL_DIRECTIONS, HALF_WINDS, CARDINALS, ORDINALS } from "./Model";
import { FILES, PID, SIDE, SQID, PID_TO, SQUARE, ALGB_MOVE, IS_PID, IS_KING, IS_QUEEN, IS_ROOK, IS_BISHOP, IS_KNIGHT, IS_PAWN } from './Model';
import { Game } from "./Game";
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
          const p = pid[pid.length - 1];
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
          return this.squares[sqid];
     };
     getPiece = (id: PID | SQID): Piece => {
          let
               piece: Piece;

          if (id in SQUARE) {
               id = this.squares[id];
          }
          piece = this.pieces[id];
          return piece || null;
     };
     assembleSquares = () => {
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
          this.squares = squares as { [key in SQID]: PID | null };
     };
     getSquares = () => {
          return this.squares;
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
          // kings done deliberately after all other pieces
          ['BK', 'WK'].forEach(kpid => {
               const king: King = this.getPiece(kpid) as King;
               king.markPins();
               king.markShadows();
               king.updatePositionalData();
          });
     }
     getCaptures = (): PID[] => {
          return this.captures;
     };
     private deconstructMove = (move: string): IDeconMove => {
          const
               turn = Game.nextTurn,
               pieces = this.pieces,
               algbMatch = move.match(ALGB_MOVE),
               castling = (algbMatch[1] === 'O'),
               capture = ((algbMatch[2] && algbMatch[2] === 'x') || false),
               ep = ((algbMatch[4] && algbMatch[4] === 'ep') || false),
               promoPhaseOne = ((algbMatch[4] && algbMatch[4] === '=') || false),
               promo = (algbMatch[5] && algbMatch[5] !== 'O') ? algbMatch[5] : null,
               ipid = (castling) ? (turn === 'W') ? 'WK' : 'BK' : algbMatch[1],
               ipiece = pieces[ipid],
               ifrom = ipiece.getSqid(),
               ito = (castling) ? (algbMatch[5] && algbMatch[5] === 'O') ? (turn === 'W') ? 'c1' : 'c8' : (turn === 'W') ? 'g1' : 'g8' : algbMatch[3] as SQID,
               epsquare = ep ? ito[0] + ifrom[1] : null,
               idrctn = Board.getDirection(ifrom, ito),
               rpid = castling ? ((ito[0] === 'g') ? ((ito[1] === '1') ? 'WKR' : 'BKR') : ((ito[1] === '1') ? 'WQR' : 'BQR')) : null,
               rpiece = castling ? pieces[rpid] : null,
               rfrom = castling ? rpiece.getSqid() : null,
               rto = castling ? ((rpid[0] === 'W') ? ((rpid[1] === 'K') ? 'f1' : 'd1') : ((rpid[1] === 'K') ? 'f8' : 'd8')) : null;

          return {
               castling: castling,
               ep: ep,
               epsquare: epsquare,
               capture: capture,
               promoPhaseOne: promoPhaseOne,
               promo: promo,
               ipid: ipid,
               ipiece: ipiece,
               ifrom: ifrom,
               ito: ito,
               idrctn: idrctn,
               rpid: rpid,
               rpiece: rpiece,
               rfrom: rfrom,
               rto: rto
          } as IDeconMove;
     }
     selfCheck = (fromsqid: SQID, tosqid: SQID): boolean => {
          // if piece on fromsqid is moved will there be discovered check?
          // if piece moves to tosqid will it's king be in check?
          const
               oppside: SIDE = ((Game.nextTurn === 'W') ? 'B' : 'W') as SIDE,
               kpid: PID = ((Game.nextTurn === 'W') ? 'WK' : 'BK') as PID,
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
     escapesCheck = (checking: SQID[], fromsqid: SQID, tosqid: SQID): boolean => {
          if (checking.length === 0) {
               return true;
          }
          const
               movingpiece = this.getPiece(fromsqid),
               mvngside = movingpiece.getSide(),
               oppside = (mvngside === 'W') ? 'B' : 'W',
               checkkedKingPid = ((mvngside === 'W') ? 'WK' : 'BK') as PID,
               checkedKingSqid = this.getPiece(checkkedKingPid).getSqid();

          if (movingpiece instanceof King) {
               const cb = this.checkedBy(tosqid, oppside);
               if (cb.length > 0) {
                    return false;
               }
               return true;
          } else if (Board.intercepts(tosqid, checking[0], checkedKingSqid)) {
               return true;
          }

          return false;
     };
     checkedBy = (subject: SQID, checkingSide: SIDE): Piece[] => {
          const pieceBuffer: Piece[] = [];
          if (subject === 'e5') {
               console.log('WKBP at e5 ?');
          }
          for (const drctn of ALL_DIRECTIONS) {
               let
                    sqid: SQID = subject,
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
     isCheckMate = (king: King): boolean => {
          // should only be called when king is checked, therefore must be one or two attackers
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

               if (this.interceptAlignment(king, attckngPiece).length) {
                    isMate = false;
               } else if (attckngPieceAttckrs.length) {
                    isMate = false;
               }
          }

          if (isMate) { console.log('mate detected'); }
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
     squareExchangers = ([mpid, sqid]: PID_TO): [PID[], PID[]] => { // all pieces that can move to this square
          let whitePids: PID[] = [], blackPids: PID[] = [];
          ALL_DIRECTIONS.forEach((drctn) => {
               let sq = sqid;
               while (sq = Board.nextSquare(drctn, sq)) {
                    const piece = this.getPiece(sq);
                    if (piece) {
                         const
                              pid = piece.getPid(),
                              forwardPawn = IS_PAWN.test(pid) && CARDINALS.includes(drctn), // pawn moving without capture
                              accessible = piece.getPotentials().includes(sqid); // potentials not sufficient as pawns can only capture diagonally step one
                         if (accessible && !piece.isPinned(sqid) && !forwardPawn) {
                              (pid[0] === 'W') ? whitePids.push(pid) : blackPids.push(pid);
                              continue; // skip this piece and continue this drctn to find discovered exchangers
                         } else if (pid === mpid) {
                              continue; // skip this piece and continue this drctn to find discovered exchangers
                         } else if (IS_PAWN.test(pid)) {
                              const pdrctn: DIRECTION = Board.getDirection(sq, sqid);
                              // if (ORDINALS.includes(pdrctn) && piece.directions.includes(pdrctn) && sqid === Board.nextSquare(pdrctn, sq) && !piece.isPinned(sqid)) {
                              //      // pawn can only exchange on diagonal one square forward
                              //      (pid[0] === 'W') ? whitePids.push(pid) : blackPids.push(pid);
                              // }
                              if (ORDINALS.includes(pdrctn) && piece.directions.includes(pdrctn) && sqid === Board.nextSquare(pdrctn, sq)) {
                                   // pawn can only exchange on diagonal one square forward
                                   if (piece.isPinned(sqid) && piece.getKPin() !== mpid) {
                                        continue;
                                   }
                                   (pid[0] === 'W') ? whitePids.push(pid) : blackPids.push(pid);
                              }
                         } else if (piece.directions.includes(drctn)) {
                              if (IS_KING.test(pid) && !(sq === Board.nextSquare(drctn, sqid))) {
                                   break; // king must be one square away to exhange
                              }
                              (pid[0] === 'W') ? whitePids.push(pid) : blackPids.push(pid);
                         }
                         break;
                    }
                    if (HALF_WINDS.includes(drctn)) {
                         break;
                    }
               }
          });
          return [whitePids, blackPids];
     }
     interceptAlignment = (attacked: Piece, attacking: Piece): PID_TO[] => {
          const
               attackedPid = attacked.getPid(),
               attackedSide = attackedPid[0] as SIDE,
               attckdsideKingPid = attackedSide + 'K',
               betweens: SQID[] = Board.betweenSquares(attacked.getSqid(), attacking.getSqid());

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
          if (move === 'compute') {
               console.log('processAlgebraicMove encountered compute');
          }
          const {
               castling, ep, epsquare, capture, promoPhaseOne, promo,
               ipid, ipiece, ifrom, ito, idrctn,
               rpid, rpiece, rfrom, rto
          } = this.deconstructMove(move);

          if (ifrom === ito) {
               // must be promotion phase 2
               promo && this.capture(ipid);
               promo && this.promote(promo, ito);

          } else {
               capture && this.capture(ito);
               ep && this.capture(epsquare, epsquare);

               ipiece.setSqid(ito);
               ipiece.auxiliaryAction(ito, this);

               this.sqidUpdateArray.push(ifrom);
               this.sqidUpdateArray.push(ito);

               if (castling) {
                    rpiece.setSqid(rto);
                    ipiece.auxiliaryAction(rto, this);
                    this.sqidUpdateArray.push(rfrom);
                    this.sqidUpdateArray.push(rto);
               }
          }
          this.assembleSquares();
          return { squaresToPieces: this.squares };
     }
     capture = (id: PID | SQID, ep: SQID = null): void => {
          const
               pid = (id in SQUARE) ? this.squares[id] : id,
               p = this.getPiece(pid),
               sq = p.getSqid();
          delete this.pieces[pid];
          if (ep) { this.sqidUpdateArray.push(sq); }
          this.captures.push(pid);
     };
     private promote = (pid: PID, sqid: SQID): void => {
          const promotedPiece = GameControl.createPiece(pid, sqid);
          this.pieces[pid] = promotedPiece;
          this.promotion = null;
     };
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
     private pieces: { [key in PID]: Piece } = null; // hash PID to Pieces
     private squares: { [key in SQID]: PID } = null; // hash SQID to PID
     private captures: PID[] = [];
     private enPassant: SQID = null;
     private promotion: SQID = null;
     private sqidUpdateArray: SQID[] = [];

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

          this.assembleSquares();
     }
}
