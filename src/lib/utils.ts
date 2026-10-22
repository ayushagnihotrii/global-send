import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Item, DateGroupedItems } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministically generate a clean title from the text content if no title is provided
 */
export function generateTitleFromContent(text?: string | null, fallback = 'Untitled text'): string {
  if (!text || !text.trim()) return fallback;

  // Extract first non-empty line
  const lines = text.trim().split(/\r?\n/);
  const firstLine = lines.find(l => l.trim().length > 0) || fallback;

  // Clean markdown headers, bullets, or extra spaces
  const cleaned = firstLine.replace(/^#+\s*/, '').replace(/^[-*•]\s*/, '').trim();

  // Truncate to a reasonable title length (60 chars)
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57) + '...';
}

/**
 * Format bytes to readable string (e.g., 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format relative date (e.g., Today at 2:30 PM, Yesterday, 21 Oct)
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Group items into Apple-inspired date categories:
 * - "Today · {date}"
 * - "Yesterday · {date}"
 * - "Earlier This Week"
 * - "Earlier This Month"
 * - "Older"
 */
export function groupItemsByDate(items: Item[]): DateGroupedItems[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: { [key: string]: { title: string; items: Item[] } } = {
    today: {
      title: `Today · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      items: [],
    },
    yesterday: {
      title: `Yesterday · ${new Date(startOfYesterday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      items: [],
    },
    thisWeek: {
      title: 'Earlier This Week',
      items: [],
    },
    thisMonth: {
      title: 'Earlier This Month',
      items: [],
    },
    older: {
      title: 'Older',
      items: [],
    },
  };

  for (const item of items) {
    const itemDate = new Date(item.createdAt);
    if (itemDate >= startOfToday) {
      groups.today.items.push(item);
    } else if (itemDate >= startOfYesterday) {
      groups.yesterday.items.push(item);
    } else if (itemDate >= startOfWeek) {
      groups.thisWeek.items.push(item);
    } else if (itemDate >= startOfMonth) {
      groups.thisMonth.items.push(item);
    } else {
      groups.older.items.push(item);
    }
  }

  // Filter out empty groups and preserve display order
  const result: DateGroupedItems[] = [];
  const keys = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];

  for (const key of keys) {
    if (groups[key].items.length > 0) {
      result.push({
        key,
        title: groups[key].title,
        items: groups[key].items,
      });
    }
  }

  return result;
}
