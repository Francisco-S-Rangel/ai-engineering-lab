import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectOpponentMove } from './opponent.ts';

const OPENING_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.unstubAllGlobals();
});

describe('selectOpponentMove', () => {
  it('falls back to a legal move when no API key is configured', async () => {
    const legalMoves = ['e5', 'd5', 'Nf6', 'c5'];

    // Random fallback — run repeatedly so a lucky single pass can't hide a bug.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await selectOpponentMove({
        fen: OPENING_FEN,
        legalMoves,
        recentMoves: ['e4'],
      });

      expect(result.source).toBe('fallback');
      expect(legalMoves).toContain(result.move);
    }
  });

  it('returns the only legal move when just one is available', async () => {
    const result = await selectOpponentMove({
      fen: OPENING_FEN,
      legalMoves: ['Kxf2'],
      recentMoves: [],
    });

    expect(result.move).toBe('Kxf2');
  });

  it('throws when there are no legal moves', async () => {
    await expect(
      selectOpponentMove({ fen: OPENING_FEN, legalMoves: [], recentMoves: [] }),
    ).rejects.toThrow('No legal moves available');
  });

  it('never returns an illegal move even when the model hallucinates one', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    // The classic LLM-chess failure: a confident answer that isn't a legal move.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Qxz9' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const legalMoves = ['e5', 'd5', 'Nf6'];
    const result = await selectOpponentMove({
      fen: OPENING_FEN,
      legalMoves,
      recentMoves: ['e4'],
    });

    expect(legalMoves).toContain(result.move);
    expect(result.source).toBe('fallback');
    // One initial attempt plus one corrective retry before giving up.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the model move when it is legal', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Nf6' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await selectOpponentMove({
      fen: OPENING_FEN,
      legalMoves: ['e5', 'd5', 'Nf6'],
      recentMoves: ['e4'],
    });

    expect(result).toEqual({ move: 'Nf6', source: 'llm' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
