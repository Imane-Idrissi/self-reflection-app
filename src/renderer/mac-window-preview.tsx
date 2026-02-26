import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import MacWindow from './components/MacWindow';

function Preview() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', padding: '64px 40px' }}>
      <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '48px', color: '#1a1a1a' }}>
        MacWindow Component
      </h1>

      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '80px' }}>
        {createElement(MacWindow, {
          src: 'https://placehold.co/1440x900/ffffff/aaa?text=Dashboard+Screen',
          alt: 'Dashboard screenshot',
        })}
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {createElement(MacWindow, {
          src: 'https://placehold.co/1440x900/ffffff/aaa?text=Report+Screen',
          alt: 'Report screenshot',
        })}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(createElement(Preview));
