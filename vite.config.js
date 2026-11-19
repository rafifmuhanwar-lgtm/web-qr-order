import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webhookHandler from './api/payment/qris/webhook.js'

function apiWebhookPlugin() {
  return {
    name: 'api-webhook-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.startsWith('/api/payment/qris/webhook')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              if (body) {
                try {
                  req.body = JSON.parse(body)
                } catch {
                  req.body = {}
                }
              } else {
                req.body = {}
              }

              // Extract query string
              const queryIndex = url.indexOf('?')
              req.query = {}
              if (queryIndex !== -1) {
                const params = new URLSearchParams(url.slice(queryIndex))
                for (const [key, val] of params.entries()) {
                  req.query[key] = val
                }
              }

              // Shim res.status and res.json for Node.js http.ServerResponse
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return res
              }

              await webhookHandler(req, res)
            } catch (err) {
              console.error('Local Webhook Error:', err)
              if (!res.writableEnded) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: err.message }))
              }
            }
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiWebhookPlugin(),
  ],
})
