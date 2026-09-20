import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs } from 'react-chessboard';
import { describeStatus } from './gameStatus';
import './ChessGame.css';

const RECENT_MOVE_COUNT = 6;

export function ChessGame() {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [status, setStatus] = useState(() => describeStatus(game));
  const [thinking, setThinking] = useState(false);

  function sync() {
    setFen(game.fen());
    setStatus(describeStatus(game));
  }

  async function playOpponentMove() {
    const legalMoves = game.moves();
    if (legalMoves.length === 0) return;

    setThinking(true);
    try {
      const response = await fetch('/api/opponent-move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fen: game.fen(),
          legalMoves,
          recentMoves: game.history().slice(-RECENT_MOVE_COUNT),
        }),
      });

      const { move } = (await response.json()) as { move: string };
      game.move(move);
    } catch (error) {
      console.error('Opponent move failed, playing a random legal move instead:', error);
      const remaining = game.moves();
      const fallback = remaining[Math.floor(Math.random() * remaining.length)];
      if (fallback) game.move(fallback);
    } finally {
      sync();
      setThinking(false);
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare || thinking || game.isGameOver()) return false;

    try {
      game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      return false;
    }

    sync();
    if (!game.isGameOver()) void playOpponentMove();
    return true;
  }

  return (
    <div className="chess-game">
      <p className="chess-game__status">{thinking ? 'Opponent is thinking…' : status}</p>
      <div className="chess-game__board">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: handlePieceDrop,
            allowDragging: !thinking && !game.isGameOver(),
          }}
        />
      </div>
    </div>
  );
}
