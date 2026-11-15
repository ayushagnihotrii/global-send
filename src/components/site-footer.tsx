import { LogoMark } from '@/components/site-nav'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

const footerLinks = [
  { label: 'Documentation', href: '#how' },
  { label: 'Security Model', href: '#security' },
  { label: 'Privacy Manifesto', href: '#principles' },
  { label: 'Status & Uptime', href: '/api/health' },
  { label: 'GitHub Repository', href: 'https://github.com/ayushagnihotrii/global-send' },
]

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-neutral-900/10 dark:border-white/10 bg-[#111111] text-white">
      {/* Giant Stylized Neo-Editorial Marquee Banner */}
      <div className="border-b border-white/10 py-12 px-5 sm:px-8 overflow-hidden">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <span className="inline-block rounded-full bg-[#CCFF00] px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-neutral-950 mb-3">
              ZERO RETENTION
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              RIDICULOUSLY <br />
              <span className="text-[#CCFF00]">PRIVATE.</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm text-neutral-400 font-medium leading-relaxed">
            Global Send is a temporary peer relay. Zero database tracking, no accounts, and ephemeral by architecture.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-base font-black uppercase tracking-tight text-white">
              Global<span className="text-[#CCFF00]">Send</span>
            </span>
          </div>
          <p className="max-w-xs font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            Open-source · end-to-end encrypted · zero-knowledge relay
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {footerLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-xs font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-[#CCFF00]"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/ayushagnihotrii/global-send"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <GithubIcon className="size-4" />
          </a>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:px-8">
          <p className="font-mono tracking-tight">
            © 2026 Global Send. Licensed under MIT. Free for personal &amp; team use.
          </p>
          <p className="font-mono tracking-tight text-neutral-400">
            Crafted with high-speed peer relays
          </p>
        </div>
      </div>
    </footer>
  )
}
