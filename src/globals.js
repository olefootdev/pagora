import * as React from 'react';
window.React = React;
window.PagoraCore = {};
window.PagoraFrete = {};
window.PagoraOther = {};
window.PagoraExtra = {};
window.PagoraApp = {};
window.PagoraApp2 = {};
window.PagoraLocator = {};
window.PagoraPhase1 = {};
window.PagoraPhase2 = {};
window.PagoraPhase3 = {};
window.PagoraPhase4 = {};
window.PagoraPhase5 = {};
window.PagoraPhase6 = {};

// Proxies para StatusBar, TopBar, Logo e Icon — lidos no topo dos phase*.jsx
// antes de core.jsx rodar. O proxy delega para o componente real em render time.
const makeProxy = (namespace, key) => (props) => {
  const comp = window[namespace] && window[namespace][key];
  if (!comp) return null;
  return React.createElement(comp, props);
};

window.StatusBar = makeProxy('PagoraCore', 'StatusBar');
window.TopBar    = makeProxy('PagoraCore', 'TopBar');
window.Logo      = makeProxy('PagoraCore', 'Logo');
window.Icon      = makeProxy('PagoraCore', '__Icon__'); // será sobrescrito por icons.jsx
