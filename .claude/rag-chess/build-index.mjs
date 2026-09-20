import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CloudClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

const COLLECTION_NAME = 'chess-knowledge';
const CHUNK_LINES = 30;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');

try {
  process.loadEnvFile(path.join(repositoryRoot, '.env'));
} catch {
  // .env not present yet — fall through, the credential check below reports it clearly.
}

function chunkPlainText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const chunks = [];

  for (let start = 0; start < lines.length; start += CHUNK_LINES) {
    const chunk = lines.slice(start, start + CHUNK_LINES).join('\n').trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

function chunkBySections(markdown) {
  return markdown
    .split(/\n(?=## )/)
    .map((section) => section.trim())
    .filter(Boolean);
}

const corpusDir = path.join(scriptDirectory, 'corpus');
const fundamentalsText = await fs.readFile(path.join(corpusDir, 'chess-fundamentals.txt'), 'utf-8');
const openingsText = await fs.readFile(path.join(corpusDir, 'openings.md'), 'utf-8');

const documents = [
  ...chunkPlainText(fundamentalsText).map((text) => ({ text, source: 'chess-fundamentals.txt' })),
  ...chunkBySections(openingsText).map((text) => ({ text, source: 'openings.md' })),
];

console.log(`Prepared ${documents.length} chunks from 2 corpus files.`);

if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.CHROMA_DATABASE) {
  console.error(
    'Missing Chroma credentials. Copy .env.example to .env and fill in CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE.',
  );
  process.exit(1);
}

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

const embeddingFunction = new DefaultEmbeddingFunction();

const collection = await client.getOrCreateCollection({
  name: COLLECTION_NAME,
  embeddingFunction,
});

// upsert (not add) so this script is safely re-runnable without duplicate-id errors.
await collection.upsert({
  ids: documents.map((_, index) => `chunk-${index}`),
  documents: documents.map((doc) => doc.text),
  metadatas: documents.map((doc) => ({ source: doc.source })),
});

console.log(`Indexed ${documents.length} chunks into Chroma collection "${COLLECTION_NAME}".`);
