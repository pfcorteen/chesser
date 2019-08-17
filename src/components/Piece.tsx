import { Board } from "./Board";
import { Game } from "./Game";
import { GameControl } from "./GameControl";
import { SIDE, SQID, PID, FILES, DIRECTION, ALL_DIRECTIONS, HALF_WINDS, CARDINALS, IPieceData, IS_PAWN } from "./Model";

export abstract class Piece {
     protected sqid: SQID | null;
     protected pid: PID;
     protected kpin: PID = null; // the pid of the piece pinning this piece against its ownking?
     protected kshadow: PID = null; // the pid of the piece that can be discovered to check the opponent king?
     protected step = false; // King, Pawn and Knight are default one step per move

     protected accessors: SQID[] = []; // all squares from which this piece may be attacked including squares occupied by piecees of this side
     protected legals: SQID[] = []; // squares this piece can legally move to
     protected potentials: SQID[] = []; // squares this.piece could move too without checking legality
     protected attckng: PID[] = [];
     protected attckrs: PID[] = [];
     protected dfndng: PID[] = [];
     protected dfndrs: PID[] = [];

     public directions: DIRECTION[] = [];

     protected abstract findLegalPositions(): void; // NNB: effect of pins on legal squares is dealt with in King.markPins()

     // protected findLegalPositions() {
     //      const
     //           control = Game.control,
     //           pnnngPiece = control.getPiece(this.kpin),
     //           pnnngSqid = pnnngPiece ? pnnngPiece.sqid : null,
     //           oppSide = this.getSide() === 'W' ? 'B' : 'W',
     //           ksqid = control.getPiece(oppSide + 'K'). getSqid();
     //
     //      for (const sqid of this.potentials) {
     //           if (pnnngSqid) {
     //                if (!Board.intercepts(sqid, pnnngSqid, ksqid)) {
     //                     continue;
     //                }
     //           }
     //           this.legals.push(sqid);
     //      }
     // }

     constructor(sqid: SQID, pid: PID) {
          this.sqid = sqid;
          this.pid = pid;
     }


     public getPid = (): PID => { return this.pid; }
     public setSqid = (sqid: SQID): void => { this.sqid = sqid; }
     public getSqid = (): SQID => { return this.sqid; }
     public getSide = (): SIDE => { return this.pid[0] as SIDE; }


     public isPinned = (destination: SQID): boolean => {
          // NB: directions of pinning piece established when set
          let retval = false;
          if (this.kpin !== null) {
               const
                    control = Game.control,
                    kpid = this.getSide() + 'K',
                    kpiece = control.getPiece(kpid),
                    pnnngPiece = control.getPiece(this.kpin),
                    pnnngSqid = pnnngPiece.sqid,
                    ksqid = kpiece.sqid,
                    pnnngDrctn = Board.getDirection(ksqid, pnnngSqid),
                    kdrctn = Board.getDirection(ksqid, destination);

               retval = !(kdrctn === pnnngDrctn);
          }
          return retval;
     }
     public setKPin = (pid: PID): void => {
          this.kpin = pid;
          // now also adjust legals
          if (pid) {
               const
                    control = Game.control,
                    oppKing = control.getPiece((this.pid[0] + 'K')),
                    pnnngPiece = control.getPiece(pid),
                    pnnngSqid = pnnngPiece.getSqid(),
                    oppKsqid = oppKing.getSqid();
               let
                    tmplgls: SQID[] = [];
               for (const sqid of this.legals) {
                    if (Board.intercepts(sqid, pnnngSqid, oppKsqid)) {
                         tmplgls.push(sqid);
                    }
               }
               this.legals = tmplgls;
          }
     }
     public getKPin = (): PID => {
          return this.kpin;
     }
     public isShadowing = (destination: SQID): boolean => {
          // NB: directions of shadowing piece established when set
          let retval = false;
          if (this.kshadow !== null) {
               const
                    control = Game.control,
                    oppside = (this.getSide() === 'W') ? 'B' : 'W',
                    kpid = oppside + 'K',
                    kpiece = control.getPiece(kpid),
                    shadingPiece = control.getPiece(this.kshadow),
                    shadingSqid = shadingPiece.sqid,
                    ksqid = kpiece.sqid,
                    shadingDrctn = Board.getDirection(ksqid, shadingSqid),
                    kdrctn = Board.getDirection(ksqid, destination);

               retval = !(kdrctn === shadingDrctn);
          }
          return retval;
     }
     public setKShadow = (pid: PID): void => {
          this.kshadow = pid;
     }
     public getKShadow = (): PID => {
          return this.kshadow;
     }
     public auxiliaryAction = (to: SQID, control: GameControl | null): void => { this.kpin = null; };
     public getAccessors = (): SQID[] => { return this.accessors; }
     public getLegals = (): SQID[] => { return this.legals; }
     public getPotentials = (): SQID[] => { return this.potentials; }
     public getAttckng = (): PID[] => { return this.attckng; }
     public getAttckrs = (): PID[] => { return this.attckrs; }
     public getDfndng = (): PID[] => { return this.dfndng; }
     public getDfndrs = (): PID[] => { return this.dfndrs.filter(a => { return a ? true : false; }); }

     // moveTowards is now in Board as a static
     // public moveTowards = (to: SQID): SQID[] => {
     //      let route: SQID[] = [];
	// 	this.legals.forEach(lgl => {
	// 		const drctn = Board.getDirection(lgl, to);
	// 		if (drctn && this.directions.includes(drctn)) {
     //                if (to === Board.nextSquare(drctn, lgl)) {
     //                     route.push(lgl);
     //                }
	// 		}
	// 	})
	// 	return route;
     // }
     public alignedWith = (sqid: SQID): boolean => {
          const drctn = Board.getDirection(this.sqid, sqid);
          return this.directions.includes(drctn);
     }
     public getLegalPositions = (): SQID[] => {
          this.legals = [];
          this.potentials = [];
          if (this.sqid) {
               this.potentials = this.findRelatedSquares();
               this.findLegalPositions();
          }
          return this.legals;
     }
     private findRelatedSquares = (): SQID[] => {
          const control = Game.control;
          this.accessors = [];
          let ptntls: SQID[] = [];
          for (const drctn of ALL_DIRECTIONS) {
               let
                    sq: SQID = this.sqid,
                    stepTooFar = false;
               while (sq = Board.nextSquare(drctn, sq)) {
                    const
                         epid = control.getPid(sq),
                         epiece: Piece = control.getPiece(epid); // encountered piece
                    if (epiece) {
                         if (epiece.getSide() === this.getSide()) {
                              this.accessors.push(sq);
                         } else if (this.directions.includes(drctn)) { // ... and logically opposite side
                              !stepTooFar && ptntls.push(sq);
                         }
                         break;
                    } else {
                         this.accessors.push(sq);
                         this.directions.includes(drctn) && !stepTooFar && ptntls.push(sq);
                    }
                    stepTooFar = this.step;
                    if (HALF_WINDS.includes(drctn)) {
                         break;
                    }
               }
          }
          return ptntls;
     }
     public updatePositionalData = (): void => {
          /** console.log(`doing updatePositionalData for ${this.pid} at ${this.sqid}`); */
          const
               gc = Game.control,
               squares = gc.getSquares(),
               side = this.getSide(),
               ep = gc.getEnPassant();

          this.kpin = null;
          this.kshadow = null;
          this.attckng = [];
          this.attckrs = [];
          this.dfndng = [];
          this.dfndrs = [];

          for (const drctn of ALL_DIRECTIONS) {
               let sq: SQID = this.sqid;
               while (sq = Board.nextSquare(drctn, sq)) {
                    const apid: PID = squares[sq];
                    if (apid) {
                         if (apid !== this.pid) {
                              const
                                   aPiece: Piece = gc.getPiece(apid),
                                   asqid = aPiece.getSqid();

                              if (side !== aPiece.getSide()) {
                                   // opp side
                                   if (this.alignedWith(asqid)) {
                                        this.attckng.push(apid);
                                   }
                                   if (aPiece.alignedWith(this.sqid)) {
                                        this.attckrs.push(apid);
                                   }
                              } else {
                                   // same side
                                   if (this.alignedWith(asqid)) {
                                        this.dfndng.push(apid);
                                   }
                                   if (aPiece.alignedWith(this.sqid)) {
                                        this.dfndrs.push(apid);
                                   }
                              }
                         } else {
                              console.log('apid equal this pid!!??');
                         }
                         break;
                    }
                    if (HALF_WINDS.includes(drctn)) {
                         break;
                    }
               }
          }

          if (ep && IS_PAWN.test(this.pid)) {
               const
                    eppid = gc.getPid(ep),
                    epside = (ep[1] === '4') ? 'W' : 'B',
                    epFileIdx = FILES.indexOf(ep[0]),
                    leftSqid = (FILES[epFileIdx - 1] + ep[1]) as SQID,
                    rightSqid = (FILES[epFileIdx + 1] + ep[1]) as SQID;
               let  lpid = gc.getPid(leftSqid),
                    rpid = gc.getPid(rightSqid);

               lpid = (lpid && IS_PAWN.test(lpid)) ? (lpid[0] !== epside ? lpid : null) : null,
               rpid = (rpid && IS_PAWN.test(rpid)) ? (rpid[0] !== epside ? rpid : null) : null;

               if (this.sqid === ep && lpid) {
                    this.attckrs.push(lpid);
               } else if (this.sqid === ep && rpid) {
                    this.attckrs.push(rpid);
               } else if (this.sqid === leftSqid || this.sqid === rightSqid) {
                    this.attckng.push(eppid);
               }
          }

          this.legals = this.getLegalPositions();
     }
     public confirmPieceData = (pieceData: IPieceData): boolean => {
          const
               tlegals = pieceData.legals,
               taccessors = pieceData.accessors,
               tpotentials = pieceData.potentials,
               tattckng = pieceData.attckng,
               tattckrs = pieceData.attckrs,
               tdfndng = pieceData.dfndng,
               tdfndrs = pieceData.dfndrs;
          let
               idx = 0,
               id = null;

          if (tlegals.length !== this.legals.length ||
               taccessors.length !== this.accessors.length ||
               tpotentials.length !== this.potentials.length ||
               tattckng.length !== this.attckng.length ||
               tattckrs.length !== this.attckrs.length ||
               tdfndng.length !== this.dfndng.length ||
               tdfndrs.length !== this.dfndrs.length) {
               return false;
          }
          for (idx = 0; idx < this.legals.length; idx += 1) {
               id = this.legals[idx];
               if (!tlegals.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.accessors.length; idx += 1) {
               id = this.accessors[idx];
               if (!taccessors.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.potentials.length; idx += 1) {
               id = this.potentials[idx];
               if (!tpotentials.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.attckng.length; idx += 1) {
               id = this.attckng[idx];
               if (!tattckng.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.attckrs.length; idx += 1) {
               id = this.attckrs[idx];
               if (!tattckrs.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.dfndng.length; idx += 1) {
               id = this.dfndng[idx];
               if (!tdfndng.includes(id)) {
                    return false;
               }
          }
          for (idx = 0; idx < this.dfndrs.length; idx += 1) {
               id = this.dfndrs[idx];
               if (!tdfndrs.includes(id)) {
                    return false;
               }
          }
          return true;
     }
}
