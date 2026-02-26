import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import LandingPage from './pages/LandingPage';

createRoot(document.getElementById('root')!).render(createElement(LandingPage));
