import { CloudClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

const COLLECTION_NAME = 'chess-knowledge';
const OPPONENT_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface OpponentMoveRequest {
  fen: string;
  legalMoves: string[];
  recentMoves: string[];
}

export interface OpponentMoveResult {
  move: string;
  /** 'llm' when Claude picked it, 'fallback' when we had to choose for it. */
  source: 'llm' | 'fallback';
}

let collectionPromise: Promise<Awaited<ReturnType<CloudClient['getOrCreateCollection']>>> | null =
  null;

function getCollection() {
  if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.CHROMA_DATABASE) {
    return null;
  }

  if (!collectionPromise) {
    const client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });

    collectionPromise = client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: new DefaultEmbeddingFunction(),
    });
  }

  return collectionPromise;
}

async function retrieveContext(fen: string): Promise<string[]> {
  const pending = getCollection();
  if (!pending) return [];

  try {
    const collection = await pending;
    const result = await collection.query({
      queryTexts: [`Chess strategy and principles relevant to this position: ${fen}`],
      nResults: 3,
    });

    return (result.documents[0] ?? []).filter((doc): doc is string => Boolean(doc));
  } catch (error) {
    console.error('[opponent] Chroma query failed, continuing without grounding:', error);
    return [];
  }
}

function pickRandomMove(legalMoves: string[]): string {
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

async function askClaude(
  request: OpponentMoveRequest,
  context: string[],
  correction?: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const contextBlock = context.length
    ? `Relevant chess knowledge:\n${context.map((entry) => `- ${entry}`).join('\n')}\n\n`
    : '';
  const correctionBlock = correction ? `${correction}\n\n` : '';

  const prompt =
    `${contextBlock}${correctionBlock}` +
    `You are playing a game of chess. Choose your next move.\n\n` +
    `Position (FEN): ${request.fen}\n` +
    `Recent moves: ${request.recentMoves.join(' ') || '(none yet)'}\n` +
    `Legal moves: ${request.legalMoves.join(', ')}\n\n` +
    `Pick exactly one move from the legal moves list above. ` +
    `Respond with only that move, copied verbatim, and nothing else.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: OPPONENT_MODEL,
        max_tokens: 16,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('[opponent] Anthropic API error:', response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === 'text')?.text ?? '';
    return text.trim();
  } catch (error) {
    console.error('[opponent] Anthropic request failed:', error);
    return null;
  }
}

export async function selectOpponentMove(
  request: OpponentMoveRequest,
): Promise<OpponentMoveResult> {
  if (request.legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }

  const context = await retrieveContext(request.fen);
  const firstAttempt = await askClaude(request, context);

  if (firstAttempt && request.legalMoves.includes(firstAttempt)) {
    return { move: firstAttempt, source: 'llm' };
  }

  // One corrective retry — the classic LLM-chess failure is naming an illegal move.
  if (firstAttempt) {
    const retry = await askClaude(
      request,
      context,
      `Your previous answer "${firstAttempt}" was not in the legal moves list. Choose again, verbatim from the list.`,
    );

    if (retry && request.legalMoves.includes(retry)) {
      return { move: retry, source: 'llm' };
    }
  }

  return { move: pickRandomMove(request.legalMoves), source: 'fallback' };
}
