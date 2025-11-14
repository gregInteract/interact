import React from 'react';

export const Loader: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 my-10">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-sky-400"></div>
      <p className="text-lg text-slate-700 dark:text-slate-300 font-semibold">Analyzing transcripts...</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">This may take a moment.</p>
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900"
          aria-label="Cancel upload"
        >
          Cancel
        </button>
      )}
    </div>
  );
};
