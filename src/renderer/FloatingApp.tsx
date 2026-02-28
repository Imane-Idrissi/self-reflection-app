import { useState, useEffect, useRef, useCallback } from 'react';

type ViewState = 'idle' | 'expanded' | 'confirming';
type CardDirection = 'above' | 'below';

const BUTTON_SIZE = 48;
const IDLE_PILL_WIDTH = 250;
const IDLE_PILL_HEIGHT = 44;
const CARD_WIDTH = 320;
const CARD_PADDING = 0;
const CONFIRMATION_DURATION = 1500;
const DRAG_THRESHOLD = 5;
const CARD_HEIGHT_ESTIMATE = 200;

export default function FloatingApp() {
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'active' | 'paused'>('active');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [closing, setClosing] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cardDirection, setCardDirection] = useState<CardDirection>('above');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    window.floatingApi.getSessionState().then((state) => {
      if (state) {
        setSessionId(state.session_id);
        setSessionStatus(state.status);
      }
    });

    window.floatingApi.onSessionStateChange((state) => {
      if (state.status === 'ended') {
        if (confirmTimerRef.current) {
          clearTimeout(confirmTimerRef.current);
          confirmTimerRef.current = null;
        }
        setText('');
        setViewState('idle');
        return;
      }
      setSessionStatus(state.status);
    });
  }, []);

  const growDirection = cardDirection === 'above' ? 'up' : 'down';

  // Resize the window when view state changes
  useEffect(() => {
    if (viewState === 'idle') {
      window.floatingApi.resize(IDLE_PILL_WIDTH + CARD_PADDING, IDLE_PILL_HEIGHT + CARD_PADDING, growDirection);
    }
  }, [viewState, growDirection]);

  // Resize for expanded/confirming states after render
  useEffect(() => {
    if (viewState === 'expanded' || viewState === 'confirming') {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const width = CARD_WIDTH + CARD_PADDING * 2;
          const height = Math.ceil(rect.height) + CARD_PADDING;
          window.floatingApi.resize(width, height, growDirection);
        }
      });
    }
  }, [viewState, text, growDirection]);

  const computeCardDirection = useCallback((): CardDirection => {
    const windowY = window.screenY;
    return windowY < CARD_HEIGHT_ESTIMATE + 50 ? 'below' : 'above';
  }, []);

  const handleButtonClick = useCallback(() => {
    if (hasDraggedRef.current) return;
    if (viewState === 'confirming') return;

    if (viewState === 'expanded') {
      dismiss();
      return;
    }

    setCardDirection(computeCardDirection());
    setViewState('expanded');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [viewState, computeCardDirection]);

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setText('');
      setClosing(false);
      setViewState('idle');
      window.floatingApi.dismissed();
    }, 200);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const response = await window.floatingApi.feelingCreate({
        session_id: sessionId,
        text: trimmed,
      });

      if (response.success) {
        setText('');
        setViewState('confirming');

        confirmTimerRef.current = setTimeout(() => {
          setViewState('idle');
          window.floatingApi.dismissed();
        }, CONFIRMATION_DURATION);
      }
    } finally {
      setSubmitting(false);
    }
  }, [text, sessionId, submitting]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && viewState === 'expanded') {
      e.preventDefault();
      dismiss();
    }
  }, [dismiss, viewState]);

  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (viewState === 'expanded' && containerRef.current && !containerRef.current.contains(e.target as Node)) {
      dismiss();
    }
  }, [viewState, dismiss]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewState !== 'idle') return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.screenX, y: e.screenY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.screenX - dragStartRef.current.x;
      const deltaY = moveEvent.screenY - dragStartRef.current.y;

      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        hasDraggedRef.current = true;
      }

      if (hasDraggedRef.current) {
        dragStartRef.current = { x: moveEvent.screenX, y: moveEvent.screenY };
        window.floatingApi.move(deltaX, deltaY);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => { hasDraggedRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [viewState]);

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const isPaused = sessionStatus === 'paused';
  const canSubmit = text.trim().length > 0 && !submitting;

  const glassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(238,242,255,0.92) 0%, rgba(224,231,255,0.88) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(165,180,252,0.7)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 1px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  };

  const cardTransition: React.CSSProperties = {
    transition: 'opacity 180ms ease-out, transform 180ms ease-out',
    opacity: closing ? 0 : 1,
    transform: closing ? 'scale(0.92) translateY(4px)' : 'scale(1) translateY(0)',
  };

  const cardEntranceStyle: React.CSSProperties = {
    animation: 'floatingCardIn 200ms ease-out',
  };

  const card = (viewState === 'expanded' || viewState === 'confirming') ? (
    viewState === 'expanded' ? (
      <div
        className="rounded-lg"
        style={{ ...glassStyle, ...cardTransition, ...(!closing ? cardEntranceStyle : {}), width: CARD_WIDTH }}
      >
        <div className="p-md">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="How are you feeling?"
            rows={2}
            className="w-full resize-none rounded-md px-sm py-sm text-body text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            style={{ minHeight: 48, maxHeight: 120, background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)' }}
          />
          <div className="flex justify-end mt-sm">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-md bg-primary-500 px-md py-xs text-small font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-200 disabled:text-primary-600 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Log feeling'}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: CARD_WIDTH, height: 56, background: '#16A34A', boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 1px 6px rgba(0,0,0,0.08)', animation: 'floatingCardIn 200ms ease-out' }}
      >
        <div className="flex items-center gap-sm">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="white" />
            <path d="M5.5 9L8 11.5L12.5 6.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-small font-medium" style={{ color: 'white' }}>Feeling logged</span>
        </div>
      </div>
    )
  ) : null;

  const button = viewState === 'idle' ? (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleButtonClick}
      className="flex items-center gap-sm rounded-full px-md transition-all duration-[150ms] ease-out"
      style={{
        ...glassStyle,
        width: IDLE_PILL_WIDTH,
        height: IDLE_PILL_HEIGHT,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 28, height: 28, background: '#6366F1', flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path
            d="M12.5 3.5L14.5 5.5L6 14H4V12L12.5 3.5Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11 5L13 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-small font-medium text-text-primary">How are you feeling?</span>
    </button>
  ) : (
    <button
      onClick={handleButtonClick}
      className="flex items-center justify-center rounded-full shadow-xl transition-all duration-[150ms] ease-out"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        background: '#6366F1',
        cursor: viewState === 'confirming' ? 'default' : 'pointer',
        border: 'none',
        flexShrink: 0,
        animation: 'floatingButtonSwap 180ms ease-out',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5 5L13 13M13 5L5 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );

  const justifyClass = cardDirection === 'above' ? 'justify-end' : 'justify-start';

  return (
    <div
      className={`flex flex-col items-end ${justifyClass} w-full h-full`}
      onClick={handleClickOutside}
      onKeyDown={handleKeyDown}
    >
      <div ref={containerRef} className="flex flex-col items-end gap-sm">
        {cardDirection === 'above' && card}
        {button}
        {cardDirection === 'below' && card}
      </div>
    </div>
  );
}
