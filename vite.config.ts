import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const SAVE_DIR = 'D:\\My-Local-Pulse\\save'

function localSavePlugin(): Plugin {
  return {
    name: 'local-save',
    configureServer(server) {
      server.middlewares.use('/api/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end('Method Not Allowed'); return
        }
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true })
            const d = new Date()
            const date = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
            const filename = `${date}.json`
            const filePath = path.join(SAVE_DIR, filename)
            fs.writeFileSync(filePath, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, path: filePath, filename }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  // 상대 경로 → GitHub Pages(https://아이디.github.io/저장소명/)와 로컬 server.js 양쪽에서 동작
  base: './',
  plugins: [react(), localSavePlugin()],
  server: {
    port: 3000,
  },
})
