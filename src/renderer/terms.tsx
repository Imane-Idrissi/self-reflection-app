import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import TermsOfUse from './pages/TermsOfUse';

createRoot(document.getElementById('root')!).render(createElement(TermsOfUse));
