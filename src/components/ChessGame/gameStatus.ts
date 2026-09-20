import type { Chess } from 'chess.js';

export function describeStatus(game: Chess): string {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    return `Checkmate — ${winner} wins`;
  }
  if (game.isStalemate()) return 'Stalemate';
  if (game.isDraw()) return 'Draw';

  const toMove = game.turn() === 'w' ? 'White' : 'Black';
  return game.isCheck() ? `Check — ${toMove} to move` : `${toMove} to move`;
}
