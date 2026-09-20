import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { selectOpponentMove } from './server/opponent.ts'

// Load .env into process.env here, in Node — deliberately NOT via Vite's loadEnv,
// so these secrets stay server-side and never reach the client bundle.
try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'))
} catch {
  // No .env yet — the opponent falls back to a random legal move.
}

function opponentApiPlugin(): Plugin {
  return {
    name: 'chess-opponent-api',
    configureServer(server) {
      server.middlewares.use('/api/opponent-move', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', () => {
          void (async () => {
            try {
              const request = JSON.parse(body)
              const result = await selectOpponentMove(request)
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (error) {
              console.error('[opponent-api] request failed:', error)
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'opponent move selection failed' }))
            }
          })()
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), opponentApiPlugin()],
})
