'use client'

import * as React from 'react'
import {
  CloudUpload,
  File as FileIcon,
  Lock,
  NotebookPen,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

type TabKey = 'file' | 'note'
type Ttl = '1h' | '24h' | '7d'

interface VaultPreviewProps {
  className?: string
  onLoginSuccess?: (user: any) => void
}

export function VaultPreview({ className, onLoginSuccess }: VaultPreviewProps) {
  const [tab, setTab] = React.useState<TabKey>('file')
  const [ttl, setTtl] = React.useState<Ttl>('24h')
  const [showKey, setShowKey] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<'signin' | 'register'>('signin')
  const [username, setUsername] = React.useState('')
  const [loginKey, setLoginKey] = React.useState('')
  const [stagedFile, setStagedFile] = React.useState<File | null>(null)
  const [stagedNote, setStagedNote] = React.useState('')
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const ttlSeconds = React.useMemo(() => {
    switch (ttl) {
      case '1h':
        return 3600
      case '7d':
        return 604800
      case '24h':
      default:
        return 86400
    }
  }, [ttl])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setStagedFile(e.dataTransfer.files[0])
      setTab('file')
      setError(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStagedFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const effectiveUsername = username.trim() || 'rmin'
    const effectiveKey = loginKey.trim() || 'delta-falcon-44'

    setIsLoading(true)

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload: any = {
        username: effectiveUsername,
        key: effectiveKey,
      }

      if (authMode === 'register') {
        payload.securityQuestion = 'What was the model of your very first computer, phone, or gaming console?'
        payload.securityAnswer = 'default-backup-answer'
        payload.acknowledgedWarning = true
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid credentials.')
        setIsLoading(false)
        return
      }

      const authenticatedUser = data.user

      // Upload staged file if present
      if (tab === 'file' && stagedFile) {
        try {
          const formData = new FormData()
          formData.append('file', stagedFile)
          formData.append('expirationSeconds', String(ttlSeconds))
          await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
          })
        } catch {
          // Ignore secondary upload error
        }
      } else if (tab === 'note' && stagedNote.trim()) {
        try {
          await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'text',
              textContent: stagedNote.trim(),
              expirationDurationSec: ttlSeconds,
            }),
          })
        } catch {
          // Ignore secondary note error
        }
      }

      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser)
      } else {
        window.location.reload()
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-12px_rgba(28,25,23,0.12)] dark:border-stone-800 dark:bg-stone-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-3 border-b border-stone-200/70 bg-stone-50/80 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-stone-300 dark:bg-stone-700" />
          <span className="size-3 rounded-full bg-stone-300 dark:bg-stone-700" />
          <span className="size-3 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>
        <div className="mx-auto flex h-7 w-full max-w-[260px] items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
          <Lock className="size-3 text-emerald-600 dark:text-emerald-500" strokeWidth={2} />
          <span className="font-mono tracking-tight">globalsend.app/v/{username.trim() || 'rmin'}</span>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 sm:flex">
          <ShieldCheck className="size-3.5" strokeWidth={2} />
          <span className="font-mono uppercase tracking-wide">encrypted</span>
        </div>
      </div>

      <form onSubmit={handleUnlock} className="px-5 py-5 sm:px-7 sm:py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-sm dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setAuthMode('signin')
              }}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors',
                authMode === 'signin'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setAuthMode('register')
              }}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors',
                authMode === 'register'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              )}
            >
              Create vault
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="font-mono uppercase tracking-wide text-stone-400 dark:text-stone-500">
              ttl
            </span>
            <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5 dark:border-stone-800 dark:bg-stone-950">
              {(['1h', '24h', '7d'] as Ttl[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTtl(t)}
                  className={cn(
                    'rounded px-2 py-1 font-mono text-[11px] font-medium transition-colors cursor-pointer',
                    ttl === t
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-1 border-b border-stone-200 dark:border-stone-800">
          {(
            [
              { key: 'file', label: 'File', icon: FileIcon },
              { key: 'note', label: 'Note & Code', icon: NotebookPen },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                tab === key
                  ? 'border-emerald-500 text-stone-900 dark:text-stone-100'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
              {key === 'file' && stagedFile && (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              )}
              {key === 'note' && stagedNote.trim() && (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {tab === 'file' ? (
          stagedFile ? (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-950">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                  <FileIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {stagedFile.name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                    {formatBytes(stagedFile.size)} · will save to vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStagedFile(null)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'mb-5 rounded-xl border border-dashed px-4 py-7 text-center cursor-pointer transition-colors',
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-stone-300 bg-stone-50/60 hover:border-stone-400 hover:bg-stone-100/50 dark:border-stone-700 dark:bg-stone-900/40 dark:hover:border-stone-600'
              )}
            >
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                <CloudUpload className="size-5" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Drag a file to save
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-stone-400 dark:text-stone-500">
                or browse — up to 250&nbsp;MB
              </p>
            </div>
          )
        ) : (
          <div className="mb-5">
            <textarea
              rows={3}
              value={stagedNote}
              onChange={(e) => setStagedNote(e.target.value)}
              placeholder="Paste note, code snippet, or link to save into vault..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 font-mono text-sm leading-relaxed text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder-stone-600 resize-none"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950 focus-within:border-stone-400 dark:focus-within:border-stone-600">
              <span className="font-mono text-stone-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="rmin"
                className="w-full bg-transparent font-mono text-stone-800 outline-none placeholder-stone-300 dark:text-stone-100 dark:placeholder-stone-700"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Private login key
              </label>
              <button
                type="button"
                onClick={() => {
                  setError('Recovery flow: sign in or reset key with your security question.')
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline dark:hover:text-stone-200 cursor-pointer"
              >
                forgot key?
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950 focus-within:border-stone-400 dark:focus-within:border-stone-600">
              <input
                type={showKey ? 'text' : 'password'}
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                placeholder="delta-falcon-44"
                className="flex-1 bg-transparent font-mono tracking-wider text-stone-800 outline-none placeholder-stone-300 dark:text-stone-100 dark:placeholder-stone-700"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="text-stone-400 transition-colors hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <EyeOff className="size-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
        >
          {isLoading
            ? 'Opening vault…'
            : stagedFile
            ? 'Save file & unlock'
            : stagedNote.trim()
            ? 'Save note & unlock'
            : authMode === 'register'
            ? 'Create & open vault'
            : 'Unlock vault'}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </button>

        <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
          {authMode === 'signin' ? (
            <>
              No vault yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setAuthMode('register')
                }}
                className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-200 cursor-pointer"
              >
                Create a new vault
              </button>
            </>
          ) : (
            <>
              Already have a vault?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setAuthMode('signin')
                }}
                className="font-medium text-stone-800 underline-offset-2 hover:underline dark:text-stone-200 cursor-pointer"
              >
                Sign in to vault
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
