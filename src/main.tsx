import { createRoot } from 'react-dom/client';
import './pagora.css';
// Sistema visual da refatoração. Escopado em `.pgx`, então não afeta as telas
// antigas — ver o cabeçalho de ui/tokens.css.
import './ui/tokens.css';
import PagoraApp from './App';
import { capturarConviteDeInstalacao, registrarServiceWorker } from './lib/pwa';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root in index.html');
createRoot(root).render(<PagoraApp />);

// O app é usado no pátio, no subsolo, na estrada com 3G ruim. O service
// worker é o que faz o Pagora abrir mesmo assim, em vez de dar lugar à tela
// de erro do navegador — que a pessoa lê como "o app quebrou".
//
// A captura do convite tem que acontecer no carregamento: o navegador dispara
// `beforeinstallprompt` uma vez e cedo, e quem não estiver escutando perde.
registrarServiceWorker(() => {
  window.dispatchEvent(new CustomEvent('pagora:atualizacao-disponivel'));
});
capturarConviteDeInstalacao(() => {
  window.dispatchEvent(new CustomEvent('pagora:instalacao-disponivel'));
});
