import { Piece } from "./Piece";

export type SIDE = 'B' | 'W';

export const ALGB_MOVE: RegExp = /^([BW].*[KQRBNP]|O)(x|-)?([a-h][1-8]|O)(ep|=|-)?([BW].*[QRNB]|O)?(\+|#|=)?$/;
export const PID_TO: RegExp = /^([BW].*[KQRBNP])([a-h][1-8])$/;
export const IS_PID: RegExp = /^[BW][KQRBN1234567890]*[KQRBNP]$/;
export const IS_KING: RegExp = /.K$/;
export const IS_QUEEN: RegExp = /.*Q$/;
export const IS_ROOK: RegExp = /.*R$/;
export const IS_BISHOP: RegExp = /.*B$/;
export const IS_KNIGHT: RegExp = /.*N$/;
export const IS_PAWN: RegExp = /.*P$/;
export const IS_PHASE_ONE_PROMO: RegExp = /.*=$/;
export const IS_SPEC_CHESS_CHAR: RegExp = /\+|\=/gi; // special chess symbols that are also regexp special characters

export const FILES = 'abcdefgh';
export const RANKS = '12345678';

export enum SQUARE {
     a8, b8, c8, d8, e8, f8, g8, h8,
     a7, b7, c7, d7, e7, f7, g7, h7,
     a6, b6, c6, d6, e6, f6, g6, h6,
     a5, b5, c5, d5, e5, f5, g5, h5,
     a4, b4, c4, d4, e4, f4, g4, h4,
     a3, b3, c3, d3, e3, f3, g3, h3,
     a2, b2, c2, d2, e2, f2, g2, h2,
     a1, b1, c1, d1, e1, f1, g1, h1
};

export type PID = string;
export type SQID = keyof typeof SQUARE;
export type PID_TO = [PID, SQID];
export type PID_TO_ONTO = [PID, SQID, SQID];
export type PID_WITH_RANK = [PID, number];

export const PIECE_ICONS = {
     WK: '\u2654', //'&#9812',   // White King
     WQ: '\u2655', //'&#9813',   // White Queen
     WR: '\u2656', //'&#9814',   // White Rook
     WB: '\u2657', //'&#9815',   // White Bishop
     WN: '\u2658', //'&#9816',   // White Knight
     WP: '\u2659', //'&#9817',   // White Pawn
     BK: '\u265A', //'&#9818',   // Black King
     BQ: '\u265B', //'&#9819',   // Black Queen
     BR: '\u265C', //'&#9820',   // Black Rook
     BB: '\u265D', //'&#9821',   // Black Bishop
     BN: '\u265E', //'&#9822',   // Black Knight
     BP: '\u265F', //'&#9823',   // Black Pawn
};

export interface IPiecePids {
     pieces: PID[];
}
export interface IPosition {
     moves: string[];
     sqidsToPids: { [key in SQID]: PID | null; };
}
export interface IMoveEffect {
     selectedSquare: SQID | null;
     legals: SQID[];
     attacking: SQID[];
     attacked: SQID[];
     defending: SQID[];
     defended: SQID[];
}

export interface IBoard extends IPosition, IMoveEffect {
     orientation: SIDE;
     onSquareSelection: (sqid: SQID) => void;
}

export interface IPieceData {
     legals: [SQID],
     accessors: [SQID],
     potentials: [SQID],
     attckng: [PID];
     attckrs: [PID];
     dfndng: [PID];
     dfndrs: [PID];
}
export interface ITest extends IMoveEffect {
     name: string,
     firstTurn: SIDE,
     testPiece: PID,
     piecePositions: { [key in PID]: SQID; },
     moves: string[],
     pieceData: IPieceData
}
export interface IGame {
     test: ITest | null;
     onTestCompleted: () => void;
     onRunTests: (run: boolean) => void;
}
export interface IGamePosition extends IPosition, IMoveEffect {
     whiteCaptures: PID[];
     blackCaptures: PID[];
     promotion: SQID;
     test: ITest | null;
}
export interface ISquare {
     sqid: SQID;
     pid: PID | null;
     selected: boolean;
     legals: boolean;
     attacking: boolean;
     attacked: boolean;
     defending: boolean;
     defended: boolean;
     checked: boolean;
     stalemate: boolean;
     onSelection: (sqid: SQID) => void;
}

export enum DIRECTION { N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW };

export const ALL_DIRECTIONS: DIRECTION[] = [
     DIRECTION.N, DIRECTION.NNE, DIRECTION.NE, DIRECTION.ENE,
     DIRECTION.E, DIRECTION.ESE, DIRECTION.SE, DIRECTION.SSE,
     DIRECTION.S, DIRECTION.SSW, DIRECTION.SW, DIRECTION.WSW,
     DIRECTION.W, DIRECTION.WNW, DIRECTION.NW, DIRECTION.NNW
];
export enum DIRECTION_GROUP { CARDINAL, ORDINAL, HALF_WIND };

export const CARDINALS: DIRECTION[] = [
     DIRECTION.N, DIRECTION.E, DIRECTION.S, DIRECTION.W
];
export const ORDINALS: DIRECTION[] = [
     DIRECTION.NE, DIRECTION.SE, DIRECTION.SW, DIRECTION.NW
];
export const HALF_WINDS: DIRECTION[] = [
     DIRECTION.NNE, DIRECTION.ENE,
     DIRECTION.ESE, DIRECTION.SSE,
     DIRECTION.SSW, DIRECTION.WSW,
     DIRECTION.WNW, DIRECTION.NNW
];
export const DIRECTION_GROUPS: DIRECTION_GROUP[] = [
     DIRECTION_GROUP.CARDINAL, DIRECTION_GROUP.ORDINAL, DIRECTION_GROUP.HALF_WIND
];
// export type OPPOSING_PAIR = [DIRECTION, DIRECTION];
//
// export const OPPOSING_DIRECTION_PAIRS: OPPOSING_PAIR[] = [
//      // clockwise assembly
//      [DIRECTION.N, DIRECTION.S],
//      [DIRECTION.NNE, DIRECTION.SSW],
//      [DIRECTION.NE, DIRECTION.SW],
//      [DIRECTION.ENE, DIRECTION.WSW],
//      [DIRECTION.E, DIRECTION.W],
//      [DIRECTION.ESE, DIRECTION.WNW],
//      [DIRECTION.SE, DIRECTION.NW],
//      [DIRECTION.SSE, DIRECTION.NNW]
// ]
export interface IPromotion {
     sqid: SQID;
     onPromotionSelection: (p: string) => void;
}
export interface IDeconMove {
     castling: boolean,
     ep: boolean,
     epsquare: SQID,
     capture: boolean,
     promoPhaseOne: boolean,
     promo: SQID,
     mpid: PID,
     mpiece: Piece,
     mfrom: SQID,
     mto: SQID,
     mdrctn: DIRECTION,
     rpid: PID,
     rpiece: Piece,
     rfrom: SQID,
     rto: SQID
}
export type PLAYER = "human" | "computer";
export type PLAYERS = [PLAYER, PLAYER] | "test";
export interface IConfigControl {
     onNewGameRequest: () => void;
     onPlayerChange: (players: string) => void;
     onFlipOrientation: () => void;
     onFlipSquareHighlights: () => void;
     onFlipPause: () => void;
}

export enum GAME_RESULT { '1-0', '0-1', '1/2-1/2' };

export interface IGeneratedMove {
     pid: PID;
     to: SQID;
     ppid: PID;
}
export interface IGameMove extends IGeneratedMove {
     result: GAME_RESULT | null;
}
export interface IScoredMove extends IGeneratedMove {
     score: number;
}
export const BasicPieceRank = {
     'K': 1000,
     'Q': 18,
     'R': 10,
     'B': 8,
     'N': 6,
     'P': 2
};
