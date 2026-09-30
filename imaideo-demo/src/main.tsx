import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initialize } from './service';
import './styles.css';
const root = createRoot(document.getElementById('root')!);
root.render(<div className="boot"><strong>imaideo<span>.</span></strong><p>正在打开你的创作空间…</p></div>);
initialize().then(() => root.render(<React.StrictMode><App /></React.StrictMode>));
