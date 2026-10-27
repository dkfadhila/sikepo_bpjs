import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
export default defineConfig({root:'frontend-dashboard',base:'/dashboard/',plugins:[react(),tailwindcss()],resolve:{alias:{'@':path.resolve('frontend-login/src')}},build:{outDir:'../spartanai-recreation/dist/dashboard',emptyOutDir:false}})
