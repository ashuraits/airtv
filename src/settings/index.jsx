import React from 'react';
import { createRoot } from 'react-dom/client';
import SettingsApp from './SettingsApp';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<SettingsApp />);
