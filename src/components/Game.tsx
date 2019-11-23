import * as React from "react";
import { Board } from "./Board";
import { Piece } from "./Piece";
import { Pawn } from "./Pawn";
import { King } from "./King";
import { Captures } from "./Captures";
import { Promotion } from "./Promotion";
import { ComputedMove } from "./ComputedMove";
import { DrawChecker } from "./DrawChecker";
import { IGamePosition, IGame, ITest, IPosition, IMoveEffect } from "./Model";
import { GAME_RESULT, IS_PID, IS_KING, IS_PHASE_ONE_PROMO, SIDE, SQID, PID, FILES, PLAYER, PLAYERS, DIRECTION } from "./Model";
import { GameControl } from "./GameControl";
import { ConfigurationControls } from "./ConfigurationControls"

export class Game extends React.Component<IGame, IGamePosition> {

     public static control: GameControl;
     public static firstTurn: SIDE = 'W';
     private static gameOn = false;

     public drawChecker = new DrawChecker();
     private orientation: SIDE = 'W';
     private squareHighlights: boolean = true;
     private nextMove: string = null;
     private players: PLAYERS = ['human' as PLAYER, 'human' as PLAYER];
     private computedMove: ComputedMove = new ComputedMove();
     private paused: boolean = false;

     public static getDerivedStateFromProps(props, state: IGamePosition): IGamePosition {
          let
               newState: IGamePosition = null,
               newMove: IMoveEffect = {
                    selectedSquare: state.selectedSquare,
                    legals: state.legals,
                    attacking: state.attacking,
                    attacked: state.attacked,
                    defending: state.defending,
                    defended: state.defended
               },
               emptyMove: IMoveEffect = {
                    selectedSquare: null,
                    legals: [],
                    attacking: [],
                    attacked: [],
                    defending: [],
                    defended: []
               };

          if (props.test && (props.test.name !== ((state.test) ? state.test.name : null))) {
               const piecePositions = props.test ? props.test.piecePositions : null;
               Game.control = new GameControl(piecePositions);
               Game.control.setCurrentPlayer(props.test ? props.test.firstTurn : Game.firstTurn);
               newMove = emptyMove;
               Game.gameOn = false;
          } else if (!Game.gameOn && props.test === null) {
               Game.control = new GameControl(null);
               Game.control.setCurrentPlayer(Game.firstTurn);
               newMove = emptyMove;
               Game.gameOn = true;
          }

          Game.control.assemblePieceData();
          newState = {
               sqidsToPids: Game.control.getSquares(), // IPosition
               moves: Game.control.getMoves(), // IPosition
               selectedSquare: newMove.selectedSquare, // IMove
               legals: newMove.legals, // IMove
               attacking: newMove.attacking, // IMove
               attacked: newMove.attacked, // IMove
               defending: newMove.defending, // IMove
               defended: newMove.defended, // IMove
               whiteCaptures: state.whiteCaptures,
               blackCaptures: state.blackCaptures,
               promotion: state.promotion,
               test: props.test,
          };

          return newState;
     }
     constructor(props: IGame) {
          super(props);

          this.state = {
               moves: [] as string[],
               sqidsToPids: null,
               selectedSquare: null,
               legals: [] as SQID[],
               attacking: [] as SQID[],
               attacked: [] as SQID[],
               defending: [] as SQID[],
               defended: [] as SQID[],
               whiteCaptures: [] as PID[],
               blackCaptures: [] as PID[],
               promotion: null,
               test: null,
          };

          Game.control = new GameControl(null);
          Game.control.setCurrentPlayer(Game.firstTurn);
     }

     public selectSquare = (selected: SQID): void => {
          const
               control = Game.control,
               currentPlayer = control.getCurrentPlayer(),
               selectedSquare = this.state.selectedSquare,
               moves = this.state.moves,
               pid = control.getPid(selected),
               lastMove = (moves.length) ? moves[moves.length - 1] : null,
               blackCaptures: PID[] = [],
               whiteCaptures: PID[] = [],
               enPassant: SQID = control.getEnPassant(),
               pidsToSqids = (pids: PID[]): SQID[] => {
                    let sqids: SQID[] = [];
                    pids.forEach((pid) => {
                         const piece = control.getPiece(pid);
                         if (piece) {
                              sqids.push(piece.getSqid());
                         }
                    });
                    return sqids;
               };

          let
               mpid: PID,
               mpiece: Piece,
               sqid: SQID = null,
               legals = this.state.legals,
               defending = this.state.defending,
               defended = this.state.defended,
               attacking = this.state.attacking,
               attacked = this.state.attacked,
               position = {
                    moves: moves,
                    sqidsToPids: control.getSquares()
               } as IPosition;


          if (this.paused) {
               return;
          } else if ((pid && IS_KING.test(pid) && pid[0] !== currentPlayer)) {
               // NNB: in case where a move is not possible then the opposite king is
               // clicked by the computedMove to signify a draw
               // possibly adapt this to cater for resignatins also!! or No?
               const
                    mkpid = (currentPlayer === 'W') ? 'WK' : 'BK',
                    mking = control.getPiece(mkpid);
               if (mking && mking.getLegals().length === 0) {
                    moves.push('1/2-1/2');
               }
          } else  if (legals.includes(selected)) {
               if (control.escapesCheck(selectedSquare, selected)) {
                    if (!control.selfCheck(selectedSquare, selected)) {
                         const
                              cpid = control.getPid(selected);
                         if (cpid) {
                              this.nextMove += 'x'; // capture
                         }
                         this.nextMove += selected;

                         mpiece = control.getPiece(selectedSquare); // obviate!
                         mpid = mpiece.getPid();

                         control.setEnPassant(null);

                         if (mpiece instanceof King) {
                              const
                                   ff = FILES.indexOf(selectedSquare[0]),
                                   tf = FILES.indexOf(selected[0]);
                              if (Math.abs(ff - tf) === 2) {
                                   // castling
                                   this.nextMove = (selected[0] === 'c') ? 'O-O-O' : 'O-O';
                              }
                         } else if (mpiece instanceof Pawn) {
                              if ((selected[1] === '8' || selected[1] === '1')) {
                                   this.nextMove += '=';
                              }
                              else if (enPassant) {
                                   const
                                        rank = enPassant[1],
                                        drctn = (rank === '4') ? DIRECTION.S : DIRECTION.N,
                                        epCaptureSqid = Board.nextSquare(drctn, enPassant);

                                   if (epCaptureSqid === selected) {
                                        this.nextMove += 'ep';
                                   }
                              }
                         }

                         position = control.processAlgebraicMove(this.nextMove);
                    }
               }

               legals = [] as SQID[];
               attacking = [] as SQID[];
               attacked = [] as SQID[];
               defending = [] as SQID[];
               defended = [] as SQID[];
          }
          else if (!selectedSquare) {

               mpid = control.getPid(selected);
               this.nextMove = mpid;

               mpiece = control.getPiece(selected);
               if (mpiece && (mpiece.getSide() === currentPlayer)) {
                    legals = mpiece.getLegals();
                    attacking = pidsToSqids(mpiece.getAttckng());
                    attacked = pidsToSqids(mpiece.getAttckrs());
                    defending = pidsToSqids(mpiece.getDfndng());
                    defended = pidsToSqids(mpiece.getDfndrs());
                    sqid = selected;
               }
          } else {
               this.nextMove = null;
               // moves.splice(-1, 1);
               sqid = null;
               legals = [] as SQID[];
               attacking = [] as SQID[];
               attacked = [] as SQID[];
               defending = [] as SQID[];
               defended = [] as SQID[];
          }

          control.getCaptures().forEach((pid) => {
               if (pid[0] === 'W') {
                    whiteCaptures.push(pid);
               } else {
                    blackCaptures.push(pid);
               }
          });

          this.setState({
               moves: position.moves,
               sqidsToPids: position.sqidsToPids,
               selectedSquare: sqid,
               legals: legals,
               attacking: attacking,
               attacked: attacked,
               defending: defending,
               defended: defended,
               blackCaptures: blackCaptures,
               whiteCaptures: whiteCaptures,
          });
     };

     handlePromotion = (pid: string): void => {
          if (this.paused) { return; }

          const
               control = Game.control,
               moves = this.state.moves,
               s = (pid[0] === 'W') ? 'W' : 'B',
               pn = Promotion.getNextPromotionNumber(),
               p = pid[pid.length - 1],
               ppid = s + pn + p,
               prmtn = control.getPromotion();

          let position: IPosition;

          this.nextMove += ppid;
          position = control.processAlgebraicMove(this.nextMove);
          // this.checked = false; // ensure fresh check via giveCheck is performed after promotion

          moves[moves.length - 1] = this.nextMove;
          setTimeout(() => {
               this.setState({
                    sqidsToPids: position.sqidsToPids,
                    moves: position.moves,
                    selectedSquare: null,
                    legals: [] as SQID[],
                    promotion: prmtn
               })
          });
     };
     handleNewGameRequest = (): void => {
          Game.gameOn = false;
          this.props.onRunTests(false);
     }
     handlePlayerSelection = (ps: string): void => {
          if (!this.paused) {
               if (ps === "Run Tests") {
                    console.log("Run Tests");
                    Game.gameOn = false;
                    this.props.onRunTests(true);
               } else if (ps === "New Game") {
                    console.log("New Game");
                    Game.gameOn = false;
                    this.props.onRunTests(false);
               } else {
                    const
                         players: PLAYERS = ps.split(' v ') as PLAYERS,
                         [white, black] = players;
                    this.players = [white as PLAYER, black as PLAYER];
                    console.log(`White: ${this.players[0]} Black: ${this.players[1]}`);
                    // let nextPlayer = (Game.nextTurn === 'W') ? this.players[0] : this.players[1];
                    let nextPlayer = (Game.control.getCurrentPlayer() === 'W') ? this.players[0] : this.players[1];
                    if (nextPlayer === 'computer') {
                         window.setTimeout(this.computedMove.compute, 10, null); // null cos no moves made yet
                    }
               }
          }
     }
     handleFlipOrientation = (): void => {
          if (!this.paused) {
               this.orientation = this.orientation === 'W' ? 'B' : 'W';
               this.forceUpdate();
          }
     }
     handleFlipSquareHighlights = (): void => {
          this.squareHighlights = !this.squareHighlights;
          this.forceUpdate();
     }
     handleFlipPause = (): void => {
          this.paused = !this.paused;
     }
     runtest = (test: ITest): void => {
          if (this.paused) { setTimeout(this.runtest, 1000, test); }
          const
               control = Game.control,
               tmoves: string[] = [].concat(...test.moves),
               smoves: string[] = [].concat(...this.state.moves),
               last = smoves.length - 1,
               legals = this.state.legals,
               attacking = this.state.attacking,
               attacked = this.state.attacked,
               defending = this.state.defending,
               defended = this.state.defended,
               blackCaptures = this.state.blackCaptures,
               whiteCaptures = this.state.whiteCaptures,
               checkTestResult = () => {
                    const
                         testPiece = Game.control.getPiece(test.testPiece),
                         result = testPiece.confirmPieceData(test.pieceData);
                    // if (!result) {
                         console.log(`${test.name} moves are ${smoves} result is ${result ? 'pass' : 'fail'}`);
                    // }
               };

          let
               secondPhase = false,
               move: string, lastStateMove: string, lastTestMove: string, position: IPosition;

          if (smoves.length === 0) {
               move = tmoves[0];
               if (move === 'compute') {
                    window.setTimeout(this.computedMove.compute, 50, move);
                    return;
               }
          } else {
               lastStateMove = smoves[smoves.length - 1];
               lastTestMove = tmoves[last];

               if (tmoves.length === smoves.length && lastStateMove === lastTestMove) {
                    checkTestResult();
                    this.props.onTestCompleted();
                    return;
               } else if (lastTestMove && /.*=$/.test(lastStateMove)) {
                    secondPhase = true;
                    move = lastTestMove;
               } else if (last < tmoves.length - 1) {
                    move = tmoves[last + 1];
               } else {
                    checkTestResult();
                    this.props.onTestCompleted();
                    return;
               }
          }

          let idx = -1;
          if (!secondPhase) { // keep '=' but defer ppid
               move = ((idx = move.indexOf("=")) >= 0) ? move.slice(0, idx + 1) : move;
          }

          if (move === 'compute') {
               window.setTimeout(this.computedMove.compute, 50, lastStateMove);
          } else {
               position = control.processAlgebraicMove(move);
               secondPhase ? (smoves[smoves.length - 1] = lastTestMove) : smoves.push(move);
               this.setState({
                    sqidsToPids: position.sqidsToPids,
                    moves: position.moves,
                    selectedSquare: null,
                    legals: legals,
                    attacking: attacking,
                    attacked: attacked,
                    defending: defending,
                    defended: defended,
                    blackCaptures: blackCaptures,
                    whiteCaptures: whiteCaptures,
               });
          }
     }
     componentDidMount() {
          const test = this.props.test;
          test && window.setTimeout(this.runtest, 10, test);
     }
     componentDidUpdate(prevProps: IGame, prevState: IGamePosition) {
          const
               control = Game.control,
               currentPlayer = control.getCurrentPlayer(),
               nextPlayer = (currentPlayer === 'W') ? this.players[0] : this.players[1],
               moves = this.state.moves;
          let
               lastMove = (moves.length) ? moves[moves.length - 1] : null;
          if (this.props.test) {
               window.setTimeout(this.runtest, 10, this.props.test);
          } else {
               if (lastMove === GAME_RESULT[GAME_RESULT[lastMove]]) {
                    console.log(`Game over: ${moves}`);
                    return;
               } else if (this.drawChecker.isGameDrawn(moves)) {
                    moves.push('1/2-1/2');
                    this.setState({ moves: moves });
                    return;
               } else if (this.nextMove && !(IS_PID.test(this.nextMove)) && !(IS_PHASE_ONE_PROMO.test(this.nextMove))) {
                    // ie if not selection of piece to move
                    console.log(`Moves: ${moves}`);
               }

               if (nextPlayer === 'computer') {
                    window.setTimeout(this.computedMove.compute, 250, lastMove);
               }
          }
     }
     render() {
          const
               orientation = this.orientation,
               whiteCaptures = this.state.whiteCaptures,
               blackCaptures = this.state.blackCaptures,
               promotion = Game.control.getPromotion(),
               topCaptures = (orientation === 'W') ? whiteCaptures : blackCaptures,
               bottomCaptures = (orientation === 'W') ? blackCaptures : whiteCaptures;

          return (
               <div className={"game"}>
                    <ConfigurationControls
                         onNewGameRequest={this.handleNewGameRequest.bind(this)}
                         onPlayerChange={this.handlePlayerSelection.bind(this)}
                         onFlipOrientation={this.handleFlipOrientation.bind(this)}
                         onFlipSquareHighlights={this.handleFlipSquareHighlights.bind(this)}
                         onFlipPause={this.handleFlipPause.bind(this)} />
                    <Captures pieces={topCaptures} />
                    <Board
                         sqidsToPids={this.state.sqidsToPids}
                         orientation={this.orientation}
                         moves={this.state.moves}
                         selectedSquare={this.state.selectedSquare}
                         legals={this.squareHighlights ? this.state.legals : []}
                         attacking={this.squareHighlights ? this.state.attacking : []}
                         attacked={this.squareHighlights ? this.state.attacked : []}
                         defending={this.squareHighlights ? this.state.defending : []}
                         defended={this.squareHighlights ? this.state.defended : []}
                         onSquareSelection={this.selectSquare.bind(this)} />
                    <Captures pieces={bottomCaptures} />
                    <Promotion
                         sqid={promotion}
                         onPromotionSelection={this.handlePromotion.bind(this)} />
               </div>
          );
     }
}
// [["e2","e4"],["e7","e5"],["g1","f3"],["b8","c6"],["f1","b5"],["f8","c5"],["e1","g1"],["g8","f6"],["b1","c3"],["d7","d6"],["d2","d4"],["e5","d4"],["b5","c6"],["b7","c6"],["f3","d4"]]
// const
//   control = new GameControl(gc.clonePieces()),
//  p = control.getPiece(selectedSquare);
//
//
// control.move(selectedSquare, selected);
// enPassant = control.getEnPassant();
// if (enPassant){
//   control.capture(enPassant);
// }
// let
//   kp = ((Game.nextTurn === 'W') ? 'WK' : 'BK') as SQID,
//  k = control.getPiece(kp),
//  sq = k.getSqid(),
//   oppside: SIDE = (Game.nextTurn === 'W') ? 'B' : 'W';
//
// if (control.checkedBy(sq, oppside).length === 0){

// let oppside: SIDE = (Game.nextTurn === 'W') ? 'B' : 'W';
