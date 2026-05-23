/* @jsxRuntime classic */
/* global React */
// Icons — outline 1.75px stroke, 24x24
const Icon = ({ name, size = 22, strokeWidth = 1.75, ...rest }) => {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth,
    strokeLinecap: "round", strokeLinejoin: "round",
    ...rest,
  };
  switch (name) {
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>;
    case "close":
      return <svg {...common}><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>;
    case "check":
      return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>;
    case "check-circle":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
    case "alert":
      return <svg {...common}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
    case "shield":
      return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case "phone":
      return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>;
    case "whatsapp":
      return <svg {...common}><path d="M3 21l1.65-3.8A9 9 0 1 1 8.2 19.4L3 21Z"/><path d="M9 10c.5 1.5 1.5 2.5 3 3l1-1c.5-.3 1-.4 1.5-.2l2 .8c.5.2.7.7.5 1.2l-.5 1.3c-.4 1-1.4 1.7-2.5 1.5C10.5 16 8 13.5 7.4 10c-.2-1.1.5-2.1 1.5-2.5L10.2 7c.5-.2 1 0 1.2.5l.8 2c.2.5.1 1-.2 1.5l-1 1Z"/></svg>;
    case "pin":
      return <svg {...common}><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "pin-fill":
      return <svg {...common} fill="currentColor" stroke="none"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Zm0-10.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>;
    case "navigation":
      return <svg {...common}><path d="m3 11 19-9-9 19-2-8-8-2Z"/></svg>;
    case "user":
      return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "users":
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "logo":
      return <svg {...common} fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M3 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3h3.2c.5 0 1 .25 1.3.65l1.3 1.7c.13.18.2.4.2.6V17a2 2 0 0 1-2 2h-1.2a3 3 0 1 1-5.6 0H10.8a3 3 0 1 1-5.6 0H4a1 1 0 0 1-1-1V5Zm13 5v5h5l-2-3-3-2Z"/></svg>;
    case "truck":
      return <svg {...common}><path d="M2 16V6h12v10"/><path d="M14 9h4l3 3v4h-7"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case "tow":
      return <svg {...common}><path d="M3 14h7l3-3h7v6h-3"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M3 11V7"/><path d="M3 7l4 2"/></svg>;
    case "dumpster":
      return <svg {...common}><path d="M3 9h18l-1.5 10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2L3 9Z"/><path d="M2 6h20"/><path d="M9 9v12"/><path d="M15 9v12"/></svg>;
    case "package":
      return <svg {...common}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>;
    case "building":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2"/><path d="M14 7h2"/><path d="M8 11h2"/><path d="M14 11h2"/><path d="M8 15h2"/><path d="M14 15h2"/></svg>;
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case "store":
      return <svg {...common}><path d="m3 9 1-5h16l1 5"/><path d="M3 9v11h18V9"/><path d="M3 9c0 1.5 1 3 3 3s3-1.5 3-3 1 3 3 3 3-1.5 3-3 1 3 3 3 3-1.5 3-3"/></svg>;
    case "elevator":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="m9 9 3-3 3 3"/><path d="m9 15 3 3 3-3"/></svg>;
    case "stairs":
      return <svg {...common}><path d="M3 21h4v-4h4v-4h4v-4h4V5h3"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>;
    case "camera":
      return <svg {...common}><path d="M3 7h4l2-3h6l2 3h4v12H3V7Z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "ruler":
      return <svg {...common}><path d="M21 3 3 21l-2-2L19 1l2 2Z"/><path d="m6 18 1 1"/><path d="m9 15 2 2"/><path d="m12 12 1 1"/><path d="m15 9 2 2"/></svg>;
    case "weight":
      return <svg {...common}><path d="M6 7h12l2 13H4L6 7Z"/><circle cx="12" cy="5" r="2"/></svg>;
    case "list":
      return <svg {...common}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="0.5"/><circle cx="3.5" cy="12" r="0.5"/><circle cx="3.5" cy="18" r="0.5"/></svg>;
    case "chart":
      return <svg {...common}><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>;
    case "wrench":
      return <svg {...common}><path d="M14 7a4 4 0 1 0 5 5l-1 5 3 3 3-3-3-3-5 1a4 4 0 0 0-5-5L4 13l3 3 7-9Z"/></svg>;
    case "key":
      return <svg {...common}><circle cx="7" cy="14" r="4"/><path d="m10 11 10-9"/><path d="m17 5 3 3"/><path d="m14 8 3 3"/></svg>;
    case "fuel":
      return <svg {...common}><path d="M3 22V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v18"/><path d="M3 22h11"/><path d="M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V18a2 2 0 0 0 4 0V8l-3-3"/></svg>;
    case "battery":
      return <svg {...common}><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "filter":
      return <svg {...common}><path d="M3 4h18l-7 9v6l-4-2v-4L3 4Z"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case "minus":
      return <svg {...common}><path d="M5 12h14"/></svg>;
    case "edit":
      return <svg {...common}><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>;
    case "money":
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/></svg>;
    case "sun-on":
      return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m5.6 5.6.7.7"/><path d="m17.7 17.7.7.7"/><path d="m5.6 18.4.7-.7"/><path d="m17.7 6.3.7-.7"/></svg>;
    case "wifi":
      return <svg {...common}><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="0.5" fill="currentColor"/></svg>;
    case "battery-status":
      return <svg {...common}><rect x="2" y="7" width="18" height="10" rx="2"/><rect x="3.5" y="8.5" width="15" height="7" rx="1" fill="currentColor"/><path d="M22 11v2"/></svg>;
    case "signal":
      return <svg {...common}><path d="M3 18h2v3H3z" fill="currentColor"/><path d="M8 14h2v7H8z" fill="currentColor"/><path d="M13 9h2v12h-2z" fill="currentColor"/><path d="M18 4h2v17h-2z" fill="currentColor"/></svg>;
    case "drag":
      return <svg {...common}><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></svg>;
    case "external":
      return <svg {...common}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
    case "logout":
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>;
    case "heart":
      return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>;
    case "star":
      return <svg {...common}><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2 1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>;
    case "headset":
      return <svg {...common}><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2v2Z"/><path d="M3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2v2Z"/></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></svg>;
    case "doc":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/></svg>;
    case "bell":
      return <svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "share":
      return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/></svg>;
    case "star-fill":
      return <svg {...common} fill="currentColor" stroke="none"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2 1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>;
    case "lightbulb":
      return <svg {...common}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
    case "mail":
      return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
    case "credit-card":
      return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>;
    case "lock":
      return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "refresh":
      return <svg {...common}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
    case "mic":
      return <svg {...common}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>;
    case "mic-off":
      return <svg {...common}><path d="m2 2 20 20"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M12 19v3"/></svg>;
    case "volume":
      return <svg {...common}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
    case "eye":
      return <svg {...common}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "gift":
      return <svg {...common}><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18"/><path d="M12 9V3"/><path d="M8 9a4 4 0 0 1 4-4c2.2 0 4 1.8 4 4"/></svg>;
    case "download":
      return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case "upload":
      return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
    case "clipboard":
      return <svg {...common}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>;
    case "pen":
      return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></svg>;
    case "message":
      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "bell-off":
      return <svg {...common}><path d="m2 2 20 20"/><path d="M8.56 2.9A7 7 0 0 1 19 9v4"/><path d="M17.71 17.71C17.2 18.98 16 19.8 14.6 20H9.4a2 2 0 0 1-1.72-3H18"/><path d="M2 8.82A15 15 0 0 0 5 15v3"/></svg>;
    case "thumbs-up":
      return <svg {...common}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>;
    case "trophy":
      return <svg {...common}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
    case "medal":
      return <svg {...common}><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>;
    case "diamond":
      return <svg {...common}><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0Z"/></svg>;
    case "moon":
      return <svg {...common}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
    case "flag":
      return <svg {...common}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
    case "bar-chart":
      return <svg {...common}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
    case "scales":
      return <svg {...common}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>;
    case "ticket":
      return <svg {...common}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>;
    case "settings":
      return <svg {...common}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "siren":
      return <svg {...common}><path d="M11.5 20H3a1 1 0 0 1 0-2h.5c0-4 2-7.5 5-9"/><path d="M12.5 20H21a1 1 0 0 0 0-2h-.5c0-4-2-7.5-5-9"/><circle cx="12" cy="8" r="2"/><path d="M12 4v2"/><path d="M4.9 10.1 6.3 11.4"/><path d="M19.1 10.1 17.7 11.4"/></svg>;
    case "keyboard":
      return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M7 16h10"/></svg>;
    case "trending-up":
      return <svg {...common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case "attach":
      return <svg {...common}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
    case "maximize":
      return <svg {...common}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
    case "minimize":
      return <svg {...common}><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

window.Icon = Icon;
