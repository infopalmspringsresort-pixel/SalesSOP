export function formatDate(date: string | Date | null): string {
  if (!date) return 'TBD';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}