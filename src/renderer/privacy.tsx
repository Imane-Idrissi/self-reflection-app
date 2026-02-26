import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import PrivacyPolicy from './pages/PrivacyPolicy';

createRoot(document.getElementById('root')!).render(createElement(PrivacyPolicy));
