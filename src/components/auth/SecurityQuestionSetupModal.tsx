'use client';

import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { PRESET_SECURITY_QUESTIONS } from '@/config/site';
import { User } from '@/lib/types';

interface SecurityQuestionSetupModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export function SecurityQuestionSetupModal({
  user,
  onComplete,
}: SecurityQuestionSetupModalProps) {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeQuestion = selectedPreset === 'custom' ? customQuestion.trim() : selectedPreset;

    if (!activeQuestion || activeQuestion.length < 10) {
      setError('Security question must be at least 10 characters long.');
      return;
    }

    if (!answer.trim() || answer.trim().length < 4) {
      setError('Security answer must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/user/security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuestion,
          answer: answer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save security question.');
        return;
      }

      toast.success('Security question configured. Account protected!');
      onComplete({
        ...user,
        hasSecurityQuestion: true,
        securityQuestionUpdatedAt: new Date().toISOString(),
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-2xl border border-black/10 dark:border-white/10 p-6 sm:p-8 space-y-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#0071e3]/10 dark:bg-[#0a84ff]/20 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2
            id="setup-modal-title"
            className="text-[20px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            Protect Your Account
          </h2>
          <p className="text-[13px] text-[#86868b] dark:text-[#98989d]">
            Global Send now supports secure key recovery. Set a security question to regain access to your vault if you ever lose your private key.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-[12px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[13px] text-[#ff3b30]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
              Select Security Question
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[12px] text-[13px] bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              {PRESET_SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q} className="dark:bg-[#1c1c1e]">
                  {q}
                </option>
              ))}
              <option value="custom" className="dark:bg-[#1c1c1e]">
                -- Write a custom question... --
              </option>
            </select>
          </div>

          {selectedPreset === 'custom' && (
            <div>
              <Input
                label="Custom Question (10-150 characters)"
                placeholder="e.g. What was the name of your first musical instrument?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                icon={<HelpCircle className="w-4 h-4" />}
                required
              />
            </div>
          )}

          <div>
            <div className="relative">
              <Input
                label="Security Answer"
                type={showAnswer ? 'text' : 'password'}
                placeholder="Enter memorable answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowAnswer(!showAnswer)}
                className="absolute right-3 top-[33px] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white cursor-pointer"
                aria-label={showAnswer ? 'Hide answer' : 'Show answer'}
              >
                {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#86868b] mt-1.5 leading-normal">
              Answers are case-insensitive and extra spaces are ignored. Minimum 4 characters.
            </p>
          </div>

          <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
            <p className="text-[11px] text-[#86868b] leading-relaxed">
              <strong>Notice:</strong> Your answer is hashed with Argon2id and never stored in plain text. If you lose your login key AND your security answer, your vault cannot be recovered.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={!answer.trim() || answer.trim().length < 4}
          >
            <span>Save Question &amp; Enter Vault</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
