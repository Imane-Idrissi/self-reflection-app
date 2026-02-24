import { useState, useEffect, useRef, useCallback } from 'react';

type ViewState = 'idle' | 'expanded' | 'confirming';
type CardDirection = 'above' | 'below';

const BUTTON_SIZE = 48;
const CARD_WIDTH = 320;
const CARD_PADDING = 20;
const CONFIRMATION_DURATION = 1500;
const DRAG_THRESHOLD = 5;
const CARD_HEIGHT_ESTIMATE = 200;

export default function FloatingApp() {
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'active' | 'paused'>('active');
  const [viewState, setViewState] = useState<ViewState>('idle');
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
      window.floatingApi.resize(BUTTON_SIZE + CARD_PADDING, BUTTON_SIZE + CARD_PADDING, growDirection);
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
    setText('');
    setViewState('idle');
    window.floatingApi.dismissed();
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

  const card = (viewState === 'expanded' || viewState === 'confirming') ? (
    viewState === 'expanded' ? (
      <div
        className="rounded-lg bg-bg-elevated shadow-xl"
        style={{ width: CARD_WIDTH }}
      >
        <div className="p-md">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="How are you feeling?"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-bg-elevated px-sm py-sm text-body text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            style={{ minHeight: 48, maxHeight: 120 }}
          />
          <div className="flex justify-end mt-sm">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-md bg-primary-500 px-md py-xs text-small font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Log feeling'}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div
        className="flex items-center justify-center rounded-lg bg-bg-elevated shadow-xl"
        style={{ width: CARD_WIDTH, height: 56 }}
      >
        <div className="flex items-center gap-sm">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#16A34A" />
            <path d="M5.5 9L8 11.5L12.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-small font-medium text-text-secondary">Feeling logged</span>
        </div>
      </div>
    )
  ) : null;

  const button = (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleButtonClick}
      className="flex items-center justify-center rounded-full shadow-xl transition-all duration-[150ms] ease-out"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        background: isPaused ? '#A8A29E' : '#6366F1',
        opacity: isPaused ? 0.5 : 1,
        cursor: viewState === 'confirming' ? 'default' : 'pointer',
        border: 'none',
        flexShrink: 0,
      }}
    >
      {viewState === 'expanded' ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M5 5L13 13M13 5L5 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M12.5 3.5L14.5 5.5L6 14H4V12L12.5 3.5Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11 5L13 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
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
