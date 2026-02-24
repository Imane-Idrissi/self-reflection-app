import { useState, useEffect } from 'react';

export default function FloatingApp() {
  const [sessionStatus, setSessionStatus] = useState<'active' | 'paused'>('active');

  useEffect(() => {
    window.floatingApi.getSessionState().then((state) => {
      if (state) setSessionStatus(state.status);
    });

    window.floatingApi.onSessionStateChange((state) => {
      if (state.status === 'ended') return;
      setSessionStatus(state.status);
    });
  }, []);

  const isPaused = sessionStatus === 'paused';

  return (
    <div className="flex items-end justify-end w-full h-full">
      <button
        className="flex items-center justify-center rounded-full shadow-xl transition-colors duration-[150ms] ease-out"
        style={{
          width: 48,
          height: 48,
          background: isPaused ? '#A8A29E' : '#6366F1',
          opacity: isPaused ? 0.5 : 1,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 3C7.5 3 5.5 5 5.5 7.5C5.5 9.5 7 11.5 10 14C13 11.5 14.5 9.5 14.5 7.5C14.5 5 12.5 3 10 3Z"
            fill="white"
            fillOpacity="0.9"
          />
        </svg>
      </button>
    </div>
  );
}
