export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp (ms, string, or Date) in Sri Lanka timezone (Asia/Colombo)
 */
export function formatTime(timestamp: number | string | Date, showDate = false): string {
  if (!timestamp) return '-';
  const d = typeof timestamp === 'number'
    ? new Date(timestamp)
    : typeof timestamp === 'string'
    ? (isNaN(Number(timestamp)) ? new Date(timestamp) : new Date(Number(timestamp)))
    : timestamp;

  if (isNaN(d.getTime())) return String(timestamp);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      year: showDate ? 'numeric' : undefined,
      month: showDate ? '2-digit' : undefined,
      day: showDate ? '2-digit' : undefined,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
    if (showDate) {
      return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }
    return `${parts.hour}:${parts.minute}:${parts.second}`;
  } catch {
    return d.toLocaleTimeString();
  }
}

