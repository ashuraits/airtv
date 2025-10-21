import React from 'react';
import { createRoot } from 'react-dom/client';
import PlayerApp from './PlayerApp';
import './player.css';

const root = createRoot(document.getElementById('root'));
root.render(<PlayerApp />);
