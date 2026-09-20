import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { describeStatus } from './gameStatus';

describe('describeStatus', () => {
  it('reports whose move it is at the start', () => {
    expect(describeStatus(new Chess())).toBe('White to move');
  });

  it('reports check', () => {
    const game = new Chess();
    // Bb5+ checks the king but black has multiple legal responses (Bd7, Nc6, c6, ...).
    game.move('e4');
    game.move('d5');
    game.move('Bb5');
    expect(describeStatus(game)).toBe('Check — Black to move');
  });

  it('reports checkmate with the winner', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Qh5');
    game.move('Nc6');
    game.move('Bc4');
    game.move('Nf6');
    game.move('Qxf7#');
    expect(describeStatus(game)).toBe('Checkmate — White wins');
  });

  it('reports stalemate', () => {
    // A known stalemate position: black to move, no legal moves, not in check.
    const game = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
    expect(describeStatus(game)).toBe('Stalemate');
  });
});
