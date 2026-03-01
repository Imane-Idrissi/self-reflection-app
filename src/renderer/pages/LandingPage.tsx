import { useState, useEffect, useCallback } from 'react';
import posthog from 'posthog-js';
import MacWindow from '../components/MacWindow';
import { UnblurryMark } from '../components/UnblurryLogo';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://eu.i.posthog.com',
    persistence: 'memory',
  });
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function UserOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}

function WaveTopLeft() {
  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 w-[200px] h-[180px] md:w-[360px] md:h-[320px] text-primary-200"
      viewBox="0 0 360 320"
      fill="currentColor"
      preserveAspectRatio="none"
    >
      <path d="M0 0h360c0 0-50 90-140 140S50 230 0 320V0z" />
    </svg>
  );
}

function WaveBottomRight() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 right-0 w-[200px] h-[180px] md:w-[360px] md:h-[320px] text-primary-200"
      viewBox="0 0 360 320"
      fill="currentColor"
      preserveAspectRatio="none"
    >
      <path d="M360 320H0c0 0 50-90 140-140S310-10 360 0v320z" />
    </svg>
  );
}

const STEPS = [
  {
    icon: TargetIcon,
    title: 'Set your intent',
    description: 'Define what you want to accomplish. AI validates specificity so your goal is measurable.',
  },
  {
    icon: MonitorIcon,
    title: 'Work normally',
    description: 'Silent background capture records window titles only. No screenshots, no keystrokes.',
  },
  {
    icon: HeartIcon,
    title: 'Log how you feel',
    description: 'A floating button lets you drop a quick note about your mood or energy, on your terms.',
  },
  {
    icon: ChartIcon,
    title: 'Get your report',
    description: 'AI identifies behavioral patterns with evidence and gives actionable suggestions.',
  },
];

const FEATURES = [
  {
    title: 'Smart intent setting',
    description:
      'Don\'t just write "be productive." The AI asks clarifying questions to help you define a specific, measurable goal for your session. Better intent means better analysis.',
    screenshot: './screenshots/intent-setting.png',
  },
  {
    title: 'Feeling logs: the "why" behind behavior',
    description:
      'Numbers show what you did, but not how you felt doing it. A small floating button lets you drop a quick note whenever you want. No notifications, no interruptions. Your feelings add the context that makes your report actually useful.',
    screenshot: './screenshots/feeling-log.png',
  },
  {
    title: 'Behavioral analysis with evidence',
    description:
      'Every pattern is backed by real data from your captured session and your feeling logs. No guesswork. You see exactly when you were focused, where you drifted, and what triggered it.',
    screenshot: './screenshots/report.png',
  },
];

const DOWNLOAD_URL_ARM64 = 'https://github.com/Imane-Idrissi/self-reflection-app/releases/latest/download/Unblurry-0.1.0-arm64.dmg';
const DOWNLOAD_URL_X64 = 'https://github.com/Imane-Idrissi/self-reflection-app/releases/latest/download/Unblurry-0.1.0-x64.dmg';

function trackDownload(source: string, arch: string) {
  if (POSTHOG_KEY) {
    posthog.capture('download_clicked', { source, arch });
  }
}

function getIsMacOS() {
  const ua = navigator.userAgent;
  return /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
}

export default function LandingPage() {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [downloadSource, setDownloadSource] = useState('');
  const [showOsTooltip, setShowOsTooltip] = useState(false);
  const isMacOS = getIsMacOS();

  const handleDownloadClick = useCallback((source: string) => {
    if (!isMacOS) {
      setShowOsTooltip(true);
      setTimeout(() => setShowOsTooltip(false), 3000);
      return;
    }
    setDownloadSource(source);
    setTermsAccepted(false);
    setShowDownloadModal(true);
  }, [isMacOS]);

  const handleCloseModal = useCallback(() => {
    setShowDownloadModal(false);
    setTermsAccepted(false);
    setDownloadSource('');
  }, []);

  const handleConfirmDownload = useCallback((arch: 'arm64' | 'x64') => {
    trackDownload(downloadSource, arch);
    const url = arch === 'arm64' ? DOWNLOAD_URL_ARM64 : DOWNLOAD_URL_X64;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    handleCloseModal();
  }, [downloadSource, handleCloseModal]);

  useEffect(() => {
    if (!showDownloadModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDownloadModal, handleCloseModal]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg-primary">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: 'rgba(250, 250, 248, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="mx-auto flex items-center justify-between px-6 py-3" style={{ maxWidth: 1080 }}>
          <span className="inline-flex items-center gap-[6px]">
              <UnblurryMark size={22} className="text-primary-500" />
              <span className="font-heading text-[17px] font-bold text-text-primary">Unblurry</span>
            </span>
          <button
            onClick={() => handleDownloadClick('navbar')}
            className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-medium text-text-inverse"
            style={{ transition: 'var(--transition-fast)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-600)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-500)')}
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download free for macOS</span>
            <span className="sm:hidden">Download</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32" style={{ overflow: 'clip', minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <WaveTopLeft />
        <WaveBottomRight />
        <div className="relative mx-auto px-6" style={{ maxWidth: 1080 }}>
          <div className="flex flex-col items-center text-center">
            {/* Pill badge */}
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-[13px] font-medium text-primary-600">
              <AppleIcon />
              Available for macOS
            </span>

            <h1
              className="font-heading font-bold text-text-primary"
              style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15, maxWidth: 720 }}
            >
              Did your work match your&nbsp;intent?
            </h1>

            <p
              className="mt-5 text-text-secondary"
              style={{ fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.6, maxWidth: 600 }}
            >
              A private desktop app that shows you what you did, whether it matched your intent, and why you worked the way you did.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleDownloadClick('hero')}
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-[15px] font-semibold text-text-inverse shadow-md"
                style={{ transition: 'var(--transition-fast)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-600)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-500)')}
              >
                <DownloadIcon />
                Download free for macOS
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-[15px] font-medium text-text-primary shadow-sm"
                style={{
                  transition: 'var(--transition-fast)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)')}
              >
                See how it works
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="pt-8 pb-12 md:pt-10 md:pb-16" style={{ backgroundColor: '#1C1917' }}>
        <div className="mx-auto px-6" style={{ maxWidth: 1080 }}>
          <h2
            className="text-center font-heading font-bold text-text-inverse"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', lineHeight: 1.2 }}
          >
            How it works
          </h2>
          <p className="mx-auto mt-3 text-center" style={{ fontSize: 17, maxWidth: 520, color: 'rgba(250,250,248,0.6)' }}>
            Four simple steps. No complex setup. Just start a session and work.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="rounded-lg p-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(75,138,255,0.3)' }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(75,138,255,0.15)', color: '#4B8AFF' }}>
                    <step.icon />
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: 'rgba(250,250,248,0.5)' }}>Step {i + 1}</span>
                </div>
                <h3 className="font-heading text-[18px] font-bold text-text-inverse">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'rgba(250,250,248,0.6)' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-16 md:py-24">
        <div className="mx-auto px-6" style={{ maxWidth: 1080 }}>
          <h2
            className="text-center font-heading font-bold text-text-primary"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', lineHeight: 1.2 }}
          >
            See it in action
          </h2>
          <p className="mx-auto mt-3 text-center text-text-secondary" style={{ fontSize: 17, maxWidth: 520 }}>
            Every step is designed to be effortless so you can focus on your work.
          </p>

          <div className="mt-14 flex flex-col gap-16 md:gap-24">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-10 md:flex-row ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="flex-1">
                  <h3
                    className="font-heading font-bold text-text-primary"
                    style={{ fontSize: 'clamp(22px, 3vw, 28px)', lineHeight: 1.3 }}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-text-secondary" style={{ maxWidth: 440 }}>
                    {feature.description}
                  </p>
                </div>
                <div className="w-full flex-1" style={{ maxWidth: 520 }}>
                  <MacWindow src={feature.screenshot} alt={feature.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Callout */}
      <section className="py-16 md:py-24" style={{ backgroundColor: '#1C1917' }}>
        <div className="mx-auto px-6" style={{ maxWidth: 1080 }}>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(75,138,255,0.15)', color: '#4B8AFF' }}>
              <ShieldIcon />
            </div>
            <h2
              className="mt-5 font-heading font-bold text-text-inverse"
              style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', lineHeight: 1.2 }}
            >
              Your data never leaves your machine
            </h2>
            <p className="mt-3" style={{ fontSize: 17, maxWidth: 520, color: 'rgba(250,250,248,0.6)' }}>
              Privacy isn't a feature. It's the architecture. Everything runs locally.
            </p>

            <div className="mt-10 grid w-full gap-6 md:grid-cols-3" style={{ maxWidth: 800 }}>
              {[
                { icon: DatabaseIcon, title: 'Local SQLite database', desc: 'All captures, feelings, and reports stored on your disk. No cloud sync.' },
                { icon: KeyIcon, title: 'Bring your own API key', desc: 'Your Gemini key, your billing. We never see or store it on any server.' },
                { icon: UserOffIcon, title: 'No account needed', desc: 'No sign-up, no login, no tracking. Download and start using it.' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-5 text-left" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(75,138,255,0.3)' }}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(75,138,255,0.15)', color: '#4B8AFF' }}>
                    <item.icon />
                  </div>
                  <h3 className="font-heading text-[15px] font-bold text-text-inverse">{item.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: 'rgba(250,250,248,0.6)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="relative py-16 md:py-24" style={{ overflow: 'clip' }}>
        <WaveTopLeft />
        <WaveBottomRight />
        <div className="relative mx-auto px-6 text-center" style={{ maxWidth: 1080 }}>
          <h2
            className="font-heading font-bold text-text-primary"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', lineHeight: 1.2 }}
          >
            Start understanding yourself better
          </h2>
          <p className="mx-auto mt-3 text-text-secondary" style={{ fontSize: 17, maxWidth: 520 }}>
            Free to use. Bring your own Gemini API key. macOS only for now.
          </p>
          <div className="mt-8">
            <button
              onClick={() => handleDownloadClick('bottom_cta')}
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 text-[16px] font-semibold text-text-inverse shadow-md"
              style={{ transition: 'var(--transition-fast)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-600)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-500)')}
            >
              <DownloadIcon />
              Download free for macOS
            </button>
          </div>
          <p className="mt-4 text-[13px] text-text-tertiary">Requires macOS 12 or later</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex items-center justify-between px-6" style={{ maxWidth: 1080 }}>
          <span className="inline-flex items-center gap-[6px] text-[13px] text-text-tertiary">
              <UnblurryMark size={14} className="text-text-tertiary" />
              Unblurry
            </span>
          <div className="flex items-center gap-4">
            <a href="./privacy.html" className="text-[13px] text-text-tertiary hover:text-text-secondary">Privacy</a>
            <a href="./terms.html" className="text-[13px] text-text-tertiary hover:text-text-secondary">Terms</a>
            <span className="text-[13px] text-text-tertiary">&copy; {new Date().getFullYear()} Imane Idrissi</span>
          </div>
        </div>
      </footer>

      {/* Download Modal */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div
            className="w-full rounded-xl shadow-xl"
            style={{ maxWidth: 440, backgroundColor: 'var(--color-bg-elevated)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <h3 className="font-heading text-[17px] font-bold text-text-primary">Download Unblurry</h3>
              <button
                onClick={handleCloseModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary"
                style={{ transition: 'var(--transition-fast)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6 pt-3">
              {/* macOS notice */}
              <div
                className="rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--color-caution-bg)', border: '1px solid var(--color-caution)' }}
              >
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-caution)' }}>
                  macOS may block Unblurry on first launch because it is not from the App Store.
                  To open it: go to <strong>System Settings → Privacy & Security</strong>, scroll down,
                  and click <strong>Open Anyway</strong> next to the Unblurry message.
                </p>
              </div>

              {/* Terms checkbox */}
              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-primary-500"
                  style={{ accentColor: 'var(--color-primary-500)' }}
                />
                <span className="text-[14px] leading-snug text-text-secondary">
                  I agree to the{' '}
                  <a
                    href="./terms.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-500 underline underline-offset-2"
                  >
                    Terms of Use
                  </a>
                </span>
              </label>

              {/* Download buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleConfirmDownload('arm64')}
                  disabled={!termsAccepted}
                  className="inline-flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-primary-500 px-4 py-3 text-text-inverse shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ transition: 'var(--transition-fast)' }}
                  onMouseEnter={(e) => { if (termsAccepted) e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'; }}
                  onMouseLeave={(e) => { if (termsAccepted) e.currentTarget.style.backgroundColor = 'var(--color-primary-500)'; }}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold">
                    <DownloadIcon />
                    Apple Silicon
                  </span>
                  <span className="text-[12px] opacity-80">M1, M2, M3, M4</span>
                </button>
                <button
                  onClick={() => handleConfirmDownload('x64')}
                  disabled={!termsAccepted}
                  className="inline-flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 text-text-primary shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ transition: 'var(--transition-fast)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { if (termsAccepted) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                  onMouseLeave={(e) => { if (termsAccepted) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold">
                    <DownloadIcon />
                    Intel
                  </span>
                  <span className="text-[12px] text-text-tertiary">2020 and earlier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OS tooltip for non-macOS users */}
      {showOsTooltip && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
          <div
            className="rounded-xl px-5 py-3 shadow-lg"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-[14px] font-medium text-text-primary">
              Unblurry is only available for macOS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
