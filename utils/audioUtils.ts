/**
 * Formats time in seconds to a MM:SS string.
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};
