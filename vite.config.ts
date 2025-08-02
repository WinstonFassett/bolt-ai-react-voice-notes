import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl';



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    basicSsl({
      domains: ['localhost', '127.0.0.1', '0.0.0.0', 'macbook-pro.local'],
    }),
    react()
  ],
})
