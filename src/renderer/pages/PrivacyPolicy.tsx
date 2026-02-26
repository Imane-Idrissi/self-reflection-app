import { UnblurryMark } from '../components/UnblurryLogo';

const LAST_UPDATED = 'February 26, 2026';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border py-4">
        <div className="mx-auto flex items-center justify-between px-6" style={{ maxWidth: 720 }}>
          <a href="./landing.html" className="inline-flex items-center gap-[6px]">
            <UnblurryMark size={20} className="text-primary-500" />
            <span className="font-heading text-[16px] font-bold text-text-primary">Unblurry</span>
          </a>
          <a href="./terms.html" className="text-[13px] font-medium text-text-secondary hover:text-text-primary">
            Terms of Use
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto px-6 py-12 md:py-16" style={{ maxWidth: 720 }}>
        <h1 className="font-heading text-[32px] font-bold text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-[14px] text-text-tertiary">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-text-secondary">
          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Summary</h2>
            <p className="mt-3">
              Unblurry is a desktop app that runs entirely on your computer. Your data stays on your machine.
              We do not operate servers, we do not have accounts, and we do not collect personal information
              from the app.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Data collected by the app</h2>
            <p className="mt-3">
              Unblurry captures the following data during a session, all stored locally on your device in a
              SQLite database:
            </p>
            <ul className="mt-3 list-disc pl-6 flex flex-col gap-2">
              <li><strong>Window titles</strong> — the names of the windows you have open. No screenshots, no keystrokes, no screen recordings.</li>
              <li><strong>Feeling logs</strong> — voluntary notes you choose to write about your mood or energy during a session.</li>
              <li><strong>Session intents</strong> — the goals you set at the start of each session.</li>
              <li><strong>AI-generated reports</strong> — behavioral analysis generated from your session data.</li>
            </ul>
            <p className="mt-3">
              None of this data is sent to us. We have no access to it. It exists only on your computer.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Third-party services</h2>

            <h3 className="mt-4 font-heading text-[17px] font-semibold text-text-primary">Google Gemini API</h3>
            <p className="mt-2">
              When you generate a report, Unblurry sends your session data (window titles, feeling logs, and
              intent) to Google's Gemini API to produce the behavioral analysis. This happens using <strong>your
              own API key</strong> — we never see or store your key on any server.
            </p>
            <p className="mt-2">
              This means Google processes your session data according to their own privacy policy. We encourage
              you to review{' '}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 underline"
              >
                Google's Gemini API terms
              </a>
              . Under their API terms, data sent via API keys is not used to train their models.
            </p>

            <h3 className="mt-6 font-heading text-[17px] font-semibold text-text-primary">PostHog (landing page only)</h3>
            <p className="mt-2">
              Our website (the landing page you downloaded the app from) uses PostHog for anonymous analytics.
              This tracking runs in <strong>cookieless mode</strong>, meaning:
            </p>
            <ul className="mt-2 list-disc pl-6 flex flex-col gap-2">
              <li>No cookies are placed on your browser.</li>
              <li>No personally identifiable information is collected.</li>
              <li>We track page views, scroll depth, and download button clicks to understand how visitors use the landing page.</li>
            </ul>
            <p className="mt-2">
              This analytics tracking does <strong>not</strong> exist inside the desktop app — only on the website.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Data storage and deletion</h2>
            <p className="mt-3">
              All app data is stored in a local SQLite database file on your computer. You can delete your data
              at any time by deleting the database file or uninstalling the app. We have no ability to access,
              recover, or delete your data because we never have it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Age requirement</h2>
            <p className="mt-3">
              Unblurry is not directed at anyone under 18. Use of the app requires a Google Gemini API key,
              which is subject to Google's age requirements.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Changes to this policy</h2>
            <p className="mt-3">
              If we update this policy, we will revise the "Last updated" date above. Since we don't collect
              email addresses or have user accounts, we recommend checking this page periodically.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">Contact</h2>
            <p className="mt-3">
              If you have questions about this policy, you can{' '}
              <a
                href="https://github.com/Imane-Idrissi/self-reflection-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 underline"
              >
                open an issue on GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex items-center justify-between px-6" style={{ maxWidth: 720 }}>
          <span className="inline-flex items-center gap-[6px] text-[13px] text-text-tertiary">
            <UnblurryMark size={14} className="text-text-tertiary" />
            Unblurry
          </span>
          <span className="text-[13px] text-text-tertiary">&copy; {new Date().getFullYear()} Imane Idrissi. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
