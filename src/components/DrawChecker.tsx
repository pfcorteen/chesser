import { IS_SPEC_CHESS_CHAR } from './Model';

export class DrawChecker {

     private static drawBffr: string = null;
     private static drawMoveRepCnt = 0;

     public isGameDrawn(moves: string[]): boolean {
          const
               // specialsRegExp: RegExp = /\+|\=/gi, // special chess symbols that are also regexp special characters
               allMoves = (moves.join(',')).replace(IS_SPEC_CHESS_CHAR, ''),
               lastMove = (moves.length ? moves[moves.length - 1] : '').replace(IS_SPEC_CHESS_CHAR, '');

          if (DrawChecker.drawBffr) {
               const
                    drawRepRgx: RegExp = new RegExp(DrawChecker.drawBffr, 'g'),
                    repsArray: RegExpMatchArray = allMoves.match(drawRepRgx);

               if (repsArray) {
                    if (repsArray.length >= 3) {
                         return true;
                    } else {
                         const
                              resArr = allMoves.match(DrawChecker.drawBffr + '(.+)$'),
                              rmndr = resArr ? resArr[1] : '', // exception: can't read property '1' of null
                              contArr = DrawChecker.drawBffr.match(rmndr);
                         if (contArr) {
                              return false;
                         }
                    }
               }
               DrawChecker.drawBffr = null;
          } else {
               const
                    lastMoveMatchRgx: RegExp = new RegExp(lastMove + '(.+)' + lastMove + '$');

               let
                    movesSubSet = allMoves,
                    lastMoveMatchArray: RegExpMatchArray = null;

               do {
                    lastMoveMatchArray = movesSubSet.match(lastMoveMatchRgx);
                    if (lastMoveMatchArray) {
                         movesSubSet = lastMoveMatchArray[1] + lastMove;
                    }
               } while (lastMoveMatchArray);

               if (movesSubSet.length < allMoves.length) {
                    const rgxMatchArry: RegExpMatchArray = movesSubSet.match(/,/g);
                    DrawChecker.drawMoveRepCnt = rgxMatchArry ? rgxMatchArry.length : 0;
                    DrawChecker.drawBffr = DrawChecker.drawMoveRepCnt ? movesSubSet : null;
               }
          }

          return false;
     }
}
