import React, { useState } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface CopyToClipboardButtonProps {
  textToCopy: string;
  className?: string;
  ariaLabel?: string;
}

export const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ textToCopy, className, ariaLabel }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (isCopied) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers or insecure contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed"; // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
        alert('Failed to copy text to clipboard.');
      }
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200 ${className}`}
      aria-label={ariaLabel || 'Copy to clipboard'}
      title={ariaLabel || 'Copy to clipboard'}
    >
      {isCopied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
    </button>
  );
};
