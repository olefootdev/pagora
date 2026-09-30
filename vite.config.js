import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ---------------------------------------------------------------------------
// Guarda de build: variável obrigatória faltando derruba o build
// ---------------------------------------------------------------------------
// Histórico que motiva isto: os 6 primeiros deploys deste projeto falharam, e
// antes disso uma versão quebrada chegou a ficar no ar. O modo de falha é
// sempre o mesmo e é traiçoeiro — `VITE_*` é substituída por literal em tempo
// de build, então secret ausente não gera erro: gera um app que compila,
// publica, abre, e não fala com o banco. O deploy sai verde e o formulário de
// waitlist engole o cadastro em silêncio.
//
// Falhar aqui troca um site quebrado em produção por um X vermelho no Actions,
// que é onde o erro custa barato.
//
// Só vale para build de produção: `npm run dev` sem .env.local continua
// rodando, porque em desenvolvimento a tela de erro do próprio client já diz
// o que falta.
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

const requireEnvOnBuild = () => ({
  name: 'pagora-require-env',
  apply: 'build',
  configResolved(config) {
    const faltando = REQUIRED_ENV.filter((k) => !config.env[k]);
    if (faltando.length === 0) return;

    throw new Error(
      [
        '',
        '  Build interrompido: variáveis obrigatórias ausentes.',
        '',
        ...faltando.map((k) => `    · ${k}`),
        '',
        '  Em CI: GitHub → Settings → Secrets and variables → Actions.',
        '  Local: copie .env.example para .env.local e preencha.',
        '',
        '  Sem elas o app compila e publica, mas não alcança o banco —',
        '  e o deploy passaria verde escondendo isso.',
        '',
      ].join('\n'),
    );
  },
});

export default defineConfig({
  plugins: [react(), requireEnvOnBuild()],
  server: {
    // 5173 é o padrão, mas não é exclusivo desta máquina — outros projetos
    // disputam a porta. Honrar PORT deixa o harness escolher em vez de o dev
    // server morrer ou pular para 5174 sem avisar quem está do lado de fora.
    // Quando a chave do Google Maps existir, a restrição por referrer precisa
    // listar a porta que estiver em uso.
    port: Number(process.env.PORT) || 5173,
  },
});
