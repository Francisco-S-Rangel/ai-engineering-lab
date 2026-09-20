import { promises as fs } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHUNK_SIZE = 40;
const EXCLUDED_DIRECTORIES = new Set(["node_modules", ".git", "dist"]);
const SRC_EXTENSIONS = new Set([".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"]);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const outputPath = path.join(scriptDirectory, "index.json");

function shouldIndex(relativePath) {
    const parts = relativePath.split(path.sep);
    const extension = path.extname(relativePath).toLowerCase();

    const isRootMarkdown = parts.length === 1 && extension === ".md";
    const isClaudeMarkdown = parts[0] === ".claude" && extension === ".md";
    const isSourceFile = SRC_EXTENSIONS.has(extension);

    return isRootMarkdown || isClaudeMarkdown || isSourceFile;
}

async function collectFiles(directory, files = []) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;

        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(repositoryRoot, fullPath);

        if (entry.isDirectory()) {
            if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
                await collectFiles(fullPath, files);
            }
        } else if (entry.isFile() && shouldIndex(relativePath)) {
            files.push({ fullPath, relativePath });
        }
    }

    return files;
}

function chunkText(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const chunks = [];

    for (let start = 0; start < lines.length; start += CHUNK_SIZE) {
        const chunk = lines.slice(start, start + CHUNK_SIZE).join("\n").trim();

        if (chunk) chunks.push(chunk);
    }

    return chunks;
}

const files = await collectFiles(repositoryRoot);
files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

const index = [];

for (const { fullPath, relativePath } of files) {
    const text = await fs.readFile(fullPath, "utf-8");
    const file = relativePath.split(path.sep).join("/");

    chunkText(text).forEach((chunk, chunkIndex) => {
        index.push({ file, text: chunk, chunkIndex });
    });
}

await fs.mkdir(scriptDirectory, { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(index, null, 2), "utf-8");

console.log(`indexed ${index.length} chunks from ${files.length} files.`);
