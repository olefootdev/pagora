import './globals.js';
import './pagora.css';

// side-effect imports — cada arquivo popula window.PagoraXxx
import './icons.jsx';
import './core.jsx';
import './frete.jsx';
import './other.jsx';
import './extra.jsx';
import './app_original.jsx';
import './app2.jsx';
import './locator.jsx';
import './phase1.jsx';
import './phase2.jsx';
import './phase3.jsx';
import './phase4.jsx';
import './phase5.jsx';
import './phase6.jsx';

import React from 'react';
import { createRoot } from 'react-dom/client';
import PagoraApp from './App.jsx';

createRoot(document.getElementById('root')).render(<PagoraApp />);
