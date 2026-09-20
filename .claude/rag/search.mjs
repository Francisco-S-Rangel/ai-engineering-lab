import { promises as fs } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESULT_LIMIT = 5;
const SNIPPET_LENGTH = 240;

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
    console.error('Usage: node .claude/rag/search.mjs <query>');
    process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(scriptDirectory, 'index.json');
const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

const terms = [
    ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
]

const results = index.map((chunk) => {
    const text = chunk.text.toLowerCase();
    const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);

    return { ...chunk, score };
}).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.chunkIndex - b.chunkIndex).slice(0, RESULT_LIMIT);

if (results.length === 0) {
    console.log("No matching chunks found.");
    process.exit(0);
}

for (const result of results) {
    const snippet = result.text.replace(/\s+/g, ' ').trim();

    const shortened = snippet.length > SNIPPET_LENGTH ? `${snippet.slice(0, SNIPPET_LENGTH)}...` : snippet;
    
    console.log(`\n${result.file} (chunk ${result.chunkIndex}, score ${result.score})`, shortened);
}