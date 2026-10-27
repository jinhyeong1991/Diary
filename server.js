'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, 'dist')
const SAVE_DIR = path.join(__dirname, 'save')
const PORT = 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
}

http.createServer((req, res) => {
  const url = req.url || '/'

  if (url.startsWith('/api/save') && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true })
        const d = new Date()
        const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
        const filename = `${date}.json`
        const filePath = path.join(SAVE_DIR, filename)
        fs.writeFileSync(filePath, body, 'utf-8')
        console.log(`[auto-save] ${new Date().toLocaleTimeString('ko-KR')} → save\\${filename}`)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, path: filePath, filename }))
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: String(e) }))
      }
    })
    return
  }

  const urlPath = decodeURIComponent(url.split('?')[0])
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)

  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403; res.end('Forbidden'); return
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  try {
    res.end(fs.readFileSync(filePath))
  } catch {
    res.statusCode = 500; res.end('Internal Server Error')
  }
}).listen(PORT, () => {
  console.log(`My-Local-Pulse → http://localhost:${PORT}`)
  console.log(`저장 폴더: ${SAVE_DIR}`)
})
