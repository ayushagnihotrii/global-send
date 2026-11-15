'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  CloudUpload,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Film,
  Lock,
  NotebookPen,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  X,
  Plus,
  CheckCircle2,
  Loader2,
  Sparkles,
  KeyRound,
  User,
  ShieldAlert,
  Flame,
} from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'
import { SITE_CONFIG } from '@/config/site'

type TabKey = 'file' | 'note'
type Ttl = '1h' | '24h' | '7d'

interface VaultPreviewProps {
  className?: string
  onLoginSuccess?: (user: any) => void
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) {
    return FileText
  }
  return FileIcon
}

export function VaultPreview({ className, onLoginSuccess }: VaultPreviewProps) {
  const [tab, setTab] = React.useState<TabKey>('file')
  const [ttl, setTtl] = React.useState<Ttl>('24h')
  const [showKey, setShowKey] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<'signin' | 'register'>('signin')
  const [username, setUsername] = React.useState('')
  const [loginKey, setLoginKey] = React.useState('')
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([])
  const [stagedNote, setStagedNote] = React.useState('')
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [uploadStatusText, setUploadStatusText] = React.useState<string | null>(null)
  const [uploadedCount, setUploadedCount] = React.useState<number>(0)
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

  const totalStagedBytes = React.useMemo(
    () => stagedFiles.reduce((acc, f) => acc + f.size, 0),
    [stagedFiles]
  )

  const addFilesToStage = React.useCallback((incoming: FileList | File[]) => {
    const fileArray = Array.from(incoming)
    if (fileArray.length === 0) return

    const maxBytes = SITE_CONFIG.maxUploadSizeBytes
    const oversized = fileArray.filter((f) => f.size > maxBytes)
    const valid = fileArray.filter((f) => f.size <= maxBytes)

    if (oversized.length > 0) {
      const maxMb = Math.round(maxBytes / (1024 * 1024))
      setError(
        `${oversized.length === 1 ? `"${oversized[0].name}" exceeds` : `${oversized.length} files exceed`} the ${maxMb} MB limit.`
      )
    } else {
      setError(null)
    }

    if (valid.length > 0) {
      setStagedFiles((prev) => {
        const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`))
        const deduped = valid.filter(
          (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
        )
        return [...prev, ...deduped]
      })
      setTab('file')
    }
  }, [])

  const removeStagedFile = (indexToRemove: number) => {
    setStagedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

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
      addFilesToStage(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToStage(e.target.files)
      e.target.value = ''
    }
  }

  const uploadSingleFile = async (file: File, expirationSec: number) => {
    const CHUNK_THRESHOLD = 3.5 * 1024 * 1024
    if (file.size > CHUNK_THRESHOLD) {
      const initRes = await fetch('/api/storage/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          title: file.name,
          expirationSeconds: expirationSec,
        }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initiate upload')
      }
      const sessionId = initData.sessionId
      const chunkSize = initData.chunkSize || 2 * 1024 * 1024
      let offset = 0
      while (offset < file.size) {
        const slice = file.slice(offset, Math.min(offset + chunkSize, file.size))
        const buf = await slice.arrayBuffer()
        const putRes = await fetch(
          `/api/storage/upload-session?sessionId=${encodeURIComponent(sessionId)}&offset=${offset}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buf,
          }
        )
        const putData = await putRes.json()
        if (!putRes.ok) {
          throw new Error(putData.error || 'Chunk upload failed')
        }
        offset += slice.size
        if (putData.completed) break
      }
    } else {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('expirationSeconds', String(expirationSec))
      await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
    }
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const effectiveUsername = username.trim() || 'rmin'
    const effectiveKey = loginKey.trim() || 'delta-falcon-44'

    setIsLoading(true)
    setUploadedCount(0)

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload: any = {
        username: effectiveUsername,
        key: effectiveKey,
      }

      if (authMode === 'register') {
        payload.securityQuestion =
          'What was the model of your very first computer, phone, or gaming console?'
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
        setError(data.error || 'Invalid credentials. Please double-check username and key.')
        setIsLoading(false)
        return
      }

      const authenticatedUser = data.user

      // Upload all staged files if present
      if (tab === 'file' && stagedFiles.length > 0) {
        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i]
          setUploadStatusText(
            stagedFiles.length === 1
              ? `Syncing ${file.name}…`
              : `Vaulting file ${i + 1} of ${stagedFiles.length}…`
          )
          try {
            await uploadSingleFile(file, ttlSeconds)
            setUploadedCount(i + 1)
          } catch {
            // Continue remaining
          }
        }
      } else if (tab === 'note' && stagedNote.trim()) {
        setUploadStatusText('Syncing private note to vault…')
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
          // Ignore
        }
      }

      setUploadStatusText(null)

      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser)
      } else {
        window.location.reload()
      }
    } catch {
      setError('Connection timeout. Please check your network.')
    } finally {
      setIsLoading(false)
      setUploadStatusText(null)
    }
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-[32px] border-2 border-neutral-900/10 dark:border-white/10 bg-white dark:bg-[#141416] p-2 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_28px_65px_-12px_rgba(0,0,0,0.7)] transition-all',
        className
      )}
    >
      {/* Hidden multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Ridiculous Window Header */}
      <div className="flex items-center justify-between rounded-t-[26px] bg-[#111111] dark:bg-[#0A0A0C] px-5 py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <div className="relative size-7 rounded-[22%] overflow-hidden shadow-sm border border-white/15 shrink-0 bg-black">
            <Image
              src="/logo.png"
              alt="Global Send Icon"
              width={28}
              height={28}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#FF5F56] inline-block shadow-sm" />
            <span className="size-2.5 rounded-full bg-[#FFBD2E] inline-block shadow-sm" />
            <span className="size-2.5 rounded-full bg-[#27C93F] inline-block shadow-sm" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-mono font-medium text-neutral-300 border border-white/10">
          <Lock className="size-3 text-[#CCFF00]" strokeWidth={2.5} />
          <span>globalsend.app/v/{username.trim() || 'rmin'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#CCFF00] animate-ping" />
          <span className="text-[10px] font-bold tracking-widest text-[#CCFF00] uppercase font-mono">
            E2EE
          </span>
        </div>
      </div>

      {/* Main Card Console Interior */}
      <form onSubmit={handleUnlock} className="p-5 sm:p-7 space-y-5">
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2.5 animate-in fade-in">
            <ShieldAlert className="size-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Control Bar: Mode Toggle Pill + Expiration Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-neutral-100 dark:bg-white/5 p-1 border border-neutral-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setAuthMode('signin')
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
                authMode === 'signin'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
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
                'rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
                authMode === 'register'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              Create vault
            </button>
          </div>

          {/* TTL Pills */}
          <div className="flex items-center gap-1 text-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 mr-1">
              TTL:
            </span>
            <div className="inline-flex rounded-full bg-neutral-100 dark:bg-white/5 p-0.5 border border-neutral-200/80 dark:border-white/10">
              {(['1h', '24h', '7d'] as Ttl[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTtl(t)}
                  className={cn(
                    'rounded-full px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer',
                    ttl === t
                      ? 'bg-neutral-900 text-white dark:bg-[#CCFF00] dark:text-neutral-950 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Selection: Files vs Note */}
        <div className="flex items-center gap-2 border-b border-neutral-200/80 dark:border-white/10 pb-2">
          {(
            [
              { key: 'file', label: 'Drop Files', icon: FileIcon },
              { key: 'note', label: 'Secret Note & Code', icon: NotebookPen },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
                tab === key
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              <Icon className="size-3.5 stroke-[2.2]" />
              <span>{label}</span>
              {key === 'file' && stagedFiles.length > 0 && (
                <span className="rounded-full bg-[#CCFF00] px-1.5 py-0.2 font-mono text-[10px] font-black text-neutral-950">
                  {stagedFiles.length}
                </span>
              )}
              {key === 'note' && stagedNote.trim() && (
                <span className="size-1.5 rounded-full bg-[#CCFF00]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Multi-File Staging Dropzone */}
        {tab === 'file' ? (
          stagedFiles.length > 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'overflow-hidden rounded-2xl border-2 transition-all',
                isDragOver
                  ? 'border-[#CCFF00] bg-[#CCFF00]/10 scale-[1.01]'
                  : 'border-neutral-900/10 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.02]'
              )}
            >
              {/* Staged File Header */}
              <div className="flex items-center justify-between border-b border-neutral-200/80 bg-neutral-100/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#CCFF00]" />
                  <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'} ·{' '}
                    {formatBytes(totalStagedBytes)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-xs border border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-white/10 dark:text-white cursor-pointer"
                  >
                    <Plus className="size-3" />
                    Add More
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setStagedFiles([])}
                    className="text-xs font-semibold text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable File List */}
              <div className="max-h-40 divide-y divide-neutral-200/60 overflow-y-auto dark:divide-white/5">
                {stagedFiles.map((file, idx) => {
                  const ItemIcon = getFileTypeIcon(file.type || '')
                  const isDone = isLoading && idx < uploadedCount
                  const isCurrent = isLoading && idx === uploadedCount

                  return (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-neutral-100/50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200/80 text-neutral-800 dark:bg-white/10 dark:text-neutral-200">
                          <ItemIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {file.name}
                          </p>
                          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>

                      {isDone ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : isCurrent ? (
                        <Loader2 className="size-3.5 animate-spin text-[#CCFF00]" />
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => removeStagedFile(idx)}
                          aria-label={`Remove ${file.name}`}
                          className="rounded-full p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-all duration-200',
                isDragOver
                  ? 'border-[#CCFF00] bg-[#CCFF00]/10 scale-[1.01]'
                  : 'border-neutral-300 bg-neutral-50/70 hover:border-neutral-900 hover:bg-neutral-100/60 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-white/30'
              )}
            >
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md">
                <CloudUpload className="size-5 stroke-[2]" />
              </div>
              <p className="text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-white">
                Drop files here or browse multiple
              </p>
              <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                P2P direct &amp; ephemeral · up to 250 MB per file
              </p>
            </div>
          )
        ) : (
          <div>
            <textarea
              rows={3}
              value={stagedNote}
              onChange={(e) => setStagedNote(e.target.value)}
              placeholder="Paste secret note, password, or code snippet to seal in vault..."
              className="w-full rounded-2xl border-2 border-neutral-200 bg-neutral-50 p-3.5 font-mono text-xs leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-900 dark:border-white/15 dark:bg-white/[0.02] dark:text-white dark:placeholder-neutral-500 dark:focus:border-[#CCFF00] resize-none transition-all"
            />
          </div>
        )}

        {/* Credentials Form Inputs */}
        <div className="space-y-3 pt-1">
          {/* Username */}
          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Username Identity
            </label>
            <div className="flex items-center gap-2 rounded-full border-2 border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white focus-within:border-neutral-900 dark:focus-within:border-[#CCFF00] transition-colors">
              <User className="size-3.5 text-neutral-400" />
              <span className="font-mono text-neutral-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="rmin"
                className="w-full bg-transparent font-mono outline-none placeholder-neutral-300 dark:placeholder-neutral-600"
              />
            </div>
          </div>

          {/* Private Login Key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Private Login Key
              </label>
              <button
                type="button"
                onClick={() => {
                  setError('Recovery flow: sign in or reset your key with your recovery security question.')
                }}
                className="font-mono text-[10px] uppercase font-bold text-neutral-400 underline-offset-2 hover:text-neutral-900 hover:underline dark:hover:text-white cursor-pointer"
              >
                Forgot key?
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-full border-2 border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-white focus-within:border-neutral-900 dark:focus-within:border-[#CCFF00] transition-colors">
              <KeyRound className="size-3.5 text-neutral-400" />
              <input
                type={showKey ? 'text' : 'password'}
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                placeholder="delta-falcon-44"
                className="flex-1 bg-transparent font-mono tracking-wider outline-none placeholder-neutral-300 dark:placeholder-neutral-600"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Big Action Pill Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#111111] dark:bg-[#CCFF00] px-6 py-3.5 text-sm font-black uppercase tracking-tight text-white dark:text-neutral-950 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-lg hover:shadow-xl"
        >
          {uploadStatusText ? (
            uploadStatusText
          ) : isLoading ? (
            'Unlocking Vault…'
          ) : tab === 'file' && stagedFiles.length > 0 ? (
            stagedFiles.length === 1 ? (
              'Save 1 File & Unlock'
            ) : (
              `Save ${stagedFiles.length} Files & Unlock`
            )
          ) : tab === 'note' && stagedNote.trim() ? (
            'Save Note & Unlock'
          ) : authMode === 'register' ? (
            'Create & Open Vault'
          ) : (
            'Unlock Vault'
          )}
          <ArrowRight
            className="size-4 stroke-[2.5] transition-transform group-hover:translate-x-1"
          />
        </button>

        {/* Switch Mode Prompt */}
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {authMode === 'signin' ? (
            <>
              Need a fresh locker?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setAuthMode('register')
                }}
                className="font-bold text-neutral-900 underline-offset-2 hover:underline dark:text-white cursor-pointer"
              >
                Create a new vault
              </button>
            </>
          ) : (
            <>
              Already have credentials?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setAuthMode('signin')
                }}
                className="font-bold text-neutral-900 underline-offset-2 hover:underline dark:text-white cursor-pointer"
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
