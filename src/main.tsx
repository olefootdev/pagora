import { createRoot } from 'react-dom/client';
import './pagora.css';
// Sistema visual da refatoração. Escopado em `.pgx`, então não afeta as telas
// antigas — ver o cabeçalho de ui/tokens.css.
import './ui/tokens.css';
import PagoraApp from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root in index.html');
createRoot(root).render(<PagoraApp />);
