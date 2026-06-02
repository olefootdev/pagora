import { createRoot } from 'react-dom/client';
import './pagora.css';
import PagoraApp from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root in index.html');
createRoot(root).render(<PagoraApp />);
