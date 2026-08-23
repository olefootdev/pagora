import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 é o padrão, mas não é exclusivo desta máquina — outros projetos
    // disputam a porta. Honrar PORT deixa o harness escolher em vez de o dev
    // server morrer ou pular para 5174 sem avisar quem está do lado de fora.
    // Quando a chave do Google Maps existir, a restrição por referrer precisa
    // listar a porta que estiver em uso.
    port: Number(process.env.PORT) || 5173,
  },
});
