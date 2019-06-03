import * as React from "react";
import { Board } from "./Board";
import { Piece } from "./Piece";
import { Pawn } from "./Pawn";
import { King } from "./King";
import { Captures } from "./Captures";
import { Promotion } from "./Promotion";
import { ComputedMove } from "./ComputedMove";
import { DrawChecker } from "./DrawChecker";
import { IGamePosition, IGame, ITest, IPosition, IS_PID, SIDE, SQID, PID, FILES, PLAYER, PLAYERS, DIRECTION } from "./Model";
import { GameControl } from "./GameControl";
import { ConfigurationControls } from "./ConfigurationControls"

export class Game extends React.Component<IGame, IGamePosition> {

  public static control: GameControl;
  public static firstTurn: SIDE = 'W';
  public static nextTurn: SIDE = Game.firstTurn;

  public drawChecker = new DrawChecker();
  public checked = false;
  private orientation: SIDE = 'W';
  private squareHighlights: boolean = true;
  private nextMove: string = null;
  private players: PLAYERS = ['human' as PLAYER, 'human' as PLAYER];
  private computedMove: ComputedMove = new ComputedMove();
  private paused: boolean = false;

  public static getDerivedStateFromProps(props, state: IGamePosition): IGamePosition {
    if (!Game.control || (props.test !== state.test)) {
      const piecePositions = props.test ? props.test.piecePositions : null;
      // Game.control = Game.control ? Game.control : new GameControl(piecePositions);
      Game.control = new GameControl(piecePositions);
    }

    Game.control.assemblePieceData();

    let nextState = state;
    nextState.squaresToPieces = Game.control.getSquares();
    nextState.test = props.test;

    return nextState;
    // return {
    //   squaresToPieces: squaresToPieces,
    //   turn: Game.nextTurn,
    //   selectedSquare: (state) ? state.selectedSquare : null,
    //   legals: (state) ? state.legals : [] as SQID[],
    //   attacking: (state) ? state.attacking : [] as SQID[],
    //   attacked: (state) ? state.attacked : [] as SQID[],
    //   defending: (state) ? state.defending : [] as SQID[],
    //   defended: (state) ? state.defended : [] as SQID[],
    //   whiteCaptures: (state) ? state.whiteCaptures : [] as PID[],
    //   blackCaptures: (state) ? state.blackCaptures : [] as PID[],
    //   moves: (state) ? state.moves : [] as string[],
    //   checking: (state) ? state.checking : [] as SQID[],
    //   promotion: (state) ? state.promotion : null,
    // };
  }

  constructor(props) {
    super(props);
    Game.nextTurn = (props.test) ? props.test.nextTurn : Game.firstTurn;
    this.state = {
      squaresToPieces: null,
      turn: Game.nextTurn,
      selectedSquare: null,
      legals: [] as SQID[],
      attacking: [] as SQID[],
      attacked: [] as SQID[],
      defending: [] as SQID[],
      defended: [] as SQID[],
      whiteCaptures: [] as PID[],
      blackCaptures: [] as PID[],
      moves: [] as string[],
      checking: [] as SQID[],
      promotion: null,
      test: null,
    };
  }

  public selectSquare = (selected: SQID): void => {
    const
      gc = Game.control,
      selectedSquare = this.state.selectedSquare,
      moves = this.state.moves,
      lastMove = (moves.length) ? moves[moves.length - 1] : null,
      blackCaptures: PID[] = [],
      whiteCaptures: PID[] = [],
      enPassant: SQID = gc.getEnPassant(),
      sqidsFromPids = (pids: PID[]): SQID[] => {
        let sqids: SQID[] = [];
        pids.forEach((pid) => {
          const piece = gc.getPiece(pid);
          if (piece) {
            sqids.push(piece.getSqid());
          }
        });
        return sqids;
      };

    if (this.paused) {
      return;
    }

    if (lastMove && lastMove.endsWith('#')){
      return;
    }

    let
      mpid: PID,
      mpiece: Piece,
      sqid: SQID = null,
      checking: SQID[] = this.state.checking,
      legals = this.state.legals,
      defending = this.state.defending,
      defended = this.state.defended,
      attacking = this.state.attacking,
      attacked = this.state.attacked,
      position = { squaresToPieces: gc.getSquares() } as IPosition;

    if (legals.includes(selected)) {
      if (gc.escapesCheck(checking, selectedSquare, selected)) {
        checking = [];
        if (!gc.selfCheck(selectedSquare, selected)) {

          const cpid = gc.getPid(selected);
          if (cpid) {
            this.nextMove += 'x'; // capture
          }
          this.nextMove += selected;

          mpiece = gc.getPiece(selectedSquare); // obviate!
          mpid = mpiece.getPid();

          gc.setEnPassant(null);

          if (mpiece instanceof King) {
            const
              ff = FILES.indexOf(selectedSquare[0]),
              tf = FILES.indexOf(selected[0]);
            if (Math.abs(ff - tf) === 2) {
              // castling
              this.nextMove = (selected[0] === 'c') ? 'O-O-O' : 'O-O';
              position = gc.processAlgebraicMove(this.nextMove);
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

          // mpiece.auxiliaryAction(selected, null);
          position = gc.processAlgebraicMove(this.nextMove);

          Game.nextTurn = (Game.nextTurn === 'W') ? 'B' : 'W';
          moves.length ? moves[moves.length] = this.nextMove : moves[0] = this.nextMove;
          this.checked = false;
        }
      }

      legals = [] as SQID[];
      attacking = [] as SQID[];
      attacked = [] as SQID[];
      defending = [] as SQID[];
      defended = [] as SQID[];

      // before nextMove is erazed check static function isDrawnGame: boolean
      if (this.drawChecker.isGameDrawn(moves)) {
        this.nextMove += '=';
        moves[moves.length - 1] = this.nextMove;
      }
    }
    else if (!selectedSquare) {

      mpid = gc.getPid(selected);
      this.nextMove = mpid;

      mpiece = gc.getPiece(selected);
      if (mpiece && (mpiece.getSide() === Game.nextTurn)) {
        legals = mpiece.getLegals();
        attacking = sqidsFromPids(mpiece.getAttckng());
        attacked = sqidsFromPids(mpiece.getAttckrs());
        defending = sqidsFromPids(mpiece.getDfndng());
        defended = sqidsFromPids(mpiece.getDfndrs());
        sqid = selected;
      }
    } else {

      this.nextMove = null;
      moves.splice(-1, 1);
      sqid = null;
      legals = [] as SQID[];
      attacking = [] as SQID[];
      attacked = [] as SQID[];
      defending = [] as SQID[];
      defended = [] as SQID[];
    }

    gc.getCaptures().forEach((pid) => {
      if (pid[0] === 'W') {
        whiteCaptures.push(pid);
      } else {
        blackCaptures.push(pid);
      }
    });

    this.setState({
      squaresToPieces: position.squaresToPieces,
      turn: Game.nextTurn,
      selectedSquare: sqid,
      moves: moves,
      checking: checking,
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
      gc = Game.control,
      moves = this.state.moves,
      s = (pid[0] === 'W') ? 'W' : 'B',
      pn = Promotion.getNextPromotionNumber(),
      p = pid[pid.length - 1],
      ppid = s + pn + p,
      prmtn = gc.getPromotion();

    let position: IPosition;

    this.nextMove += ppid;
    position = gc.processAlgebraicMove(this.nextMove);
    this.checked = false; // ensure fresh check via giveCheck is performed after promotion

    moves[moves.length - 1] = this.nextMove;
    setTimeout(() => {
      this.setState({
        squaresToPieces: position.squaresToPieces,
        moves: moves,
        selectedSquare: null,
        legals: [] as SQID[],
        promotion: prmtn
      })
    });
  }
  handlePlayerSelection = (ps: string): void => {
    if (this.paused) { return; }

    if (ps === "test") {
      console.log("test");
      this.props.onRunTests();
    } else {
      const
        players: PLAYERS = ps.split(' v ') as PLAYERS,
        [white, black] = players;
      this.players = [white as PLAYER, black as PLAYER];
      console.log(`White: ${this.players[0]} Black: ${this.players[1]}`);
      let nextPlayer = (Game.nextTurn === 'W') ? this.players[0] : this.players[1];
      if (nextPlayer === 'computer') {
        window.setTimeout(this.computedMove.compute, 10, null); // null cos no moves made yet
      }
    }
  }
  handleFlipOrientation = (): void => {
    if (this.paused) { return; }

    this.orientation = this.orientation === 'W' ? 'B' : 'W';
    this.forceUpdate();
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
      gc = Game.control,
      tmoves: string[] = [].concat(...test.moves),
      smoves: string[] = [].concat(...this.state.moves),
      last = smoves.length - 1,
      turn = (Game.nextTurn === 'W') ? 'B' : 'W',
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
        console.log(`${test.name} moves are ${smoves} result is ${result ? 'pass' : 'fail'}`);
      };

      let move, lastStateMove, lastTestMove, secondPhase: boolean, position: IPosition ;

    if (smoves.length === 0) {
      move = tmoves[0];
      if (move === 'compute') {
        window.setTimeout(this.computedMove.compute, 50, move);
        return;
      }
    } else {
      lastStateMove = smoves[smoves.length - 1];
      lastTestMove = tmoves[last];
      if ((lastTestMove as string) === 'compute') {
        checkTestResult();
        this.props.onTestCompleted();
        return;
      } else
        if (lastTestMove && lastStateMove !== lastTestMove) {
        secondPhase = lastTestMove.startsWith(lastStateMove);
        move = lastTestMove;
      } else
        if (last < tmoves.length - 1) {
        move = tmoves[last + 1];
      }
      else {
        checkTestResult();
        this.props.onTestCompleted();
        return;
      }
    }

    let idx = -1;
    if (!secondPhase){ // keep '=' but defer ppid
      move = ((idx = move.indexOf("=")) >= 0) ? move.slice(0, idx + 1) : move;
    }

    if (move === 'compute') {
      // window.setTimeout(this.computedMove.compute, 50, move);
      window.setTimeout(this.computedMove.compute, 50, lastStateMove);
      return;
    } else {
      position = gc.processAlgebraicMove(move);
    }

    secondPhase ? (smoves[smoves.length - 1] = lastTestMove) : smoves.push(move);

    this.setState({
      squaresToPieces: position.squaresToPieces,
      turn: turn,
      selectedSquare: null,
      moves: smoves,
      checking: [],
      legals: legals,
      attacking: attacking,
      attacked: attacked,
      defending: defending,
      defended: defended,
      blackCaptures: blackCaptures,
      whiteCaptures: whiteCaptures,
    });
  }
  componentDidMount() {
    const test = this.props.test;
    test && window.setTimeout(this.runtest, 10, test);
  }
  componentDidUpdate(prevProps: IGame, prevState: IGamePosition) {
    const
      gc = Game.control,
      moves = this.state.moves,
      lastMove = moves.length ? moves[moves.length -  1] : '';

    // first update the piece data
    if (this.props.test) {
      if (lastMove.length && !lastMove.endsWith('=')) {
        gc.updateData();
      }
    } else if ((prevState.selectedSquare && !this.state.selectedSquare && !lastMove.endsWith('='))
                || (lastMove.includes('=') && !lastMove.endsWith('='))) {
      // we dont want to be updating the piece data unnecessarily in every rendering cycle
      // the condition should limit the update to the situation just after a move has been made,
      // and will ignore piece selection and check/checkmate renders and promotion first phase
      gc.updateData();
    }

    const
      kpid = (this.state.turn === 'W') ? 'WK' : 'BK',
      kpiece = gc.getPiece(kpid as PID),
      kattckrs = kpiece ? kpiece.getAttckrs() : [];
      if (kpiece === null) {
        console.log('wtf');
      }
    if (this.props.test) {
      window.setTimeout(this.runtest, 10, this.props.test);
    } else if (kattckrs.length && (this.state.checking.length === 0)) {
      const
        checkers: SQID[] = [];

      kattckrs.forEach(pid => {
        const p = gc.getPiece(pid);
        p && checkers.push(p.getSqid());
      });

      moves[moves.length - 1] += (gc.isCheckMate(kpiece as King)) ? '#' : '+';
      window.setTimeout(() => {
        this.setState({
          moves: moves,
          checking: checkers
        })
      });
    } else {
      if (this.nextMove && !(IS_PID.test(this.nextMove))) {
        // ie if not selection of piece to move
        console.log(`Moves: ${moves}`);
      }
      const nextPlayer = (Game.nextTurn === 'W') ? this.players[0] : this.players[1];
      if (nextPlayer === 'computer') {
        const lastMove = (moves.length) ? moves[moves.length - 1] : null;
        window.setTimeout(this.computedMove.compute, 250, lastMove);
      }
    }
  }
  render() {
    const
      orientation = this.orientation,  //this.state.orientation,
      whiteCaptures = this.state.whiteCaptures,
      blackCaptures = this.state.blackCaptures,
      promotion = Game.control.getPromotion(),
      topCaptures = (orientation === 'W') ? whiteCaptures : blackCaptures,
      bottomCaptures = (orientation === 'W') ? blackCaptures : whiteCaptures;

    return (
      <div className={"game"}>
        <ConfigurationControls
          onPlayerChange={this.handlePlayerSelection.bind(this)}
          onFlipOrientation={this.handleFlipOrientation.bind(this)}
          onFlipSquareHighlights={this.handleFlipSquareHighlights.bind(this)}
          onFlipPause={this.handleFlipPause.bind(this)} />
        <Captures pieces={topCaptures} />
        <Board
          squaresToPieces={this.state.squaresToPieces}
          orientation={this.orientation}
          turn={this.state.turn}
          moves={this.state.moves}
          checking={this.state.checking}
          selectedSquare={this.state.selectedSquare}
          legals={this.squareHighlights ? this.state.legals : []}
          attacking={this.squareHighlights ? this.state.attacking : []}
          attacked={this.squareHighlights ? this.state.attacked : []}
          defending={this.squareHighlights ? this.state.defending : []}
          defended={this.squareHighlights ? this.state.defended : []}
          onSquareSelection={this.selectSquare.bind(this)} />
        <Captures pieces={bottomCaptures} />
        <Promotion
          side={(Game.nextTurn === 'W') ? 'B' : 'W'}
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
