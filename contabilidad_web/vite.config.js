import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

let commitHash = 'unknown'
try {
  commitHash = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse --short HEAD').toString().trim()
  if (commitHash.length > 7) commitHash = commitHash.substring(0, 7)
} catch (e) {
  commitHash = 'dev'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash)
  }
})
