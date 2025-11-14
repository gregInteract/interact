import React from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';


interface KeyHighlightsProps {
  highlights: {emoji: string, text: string}[];
  isLoading: boolean;
  error: string | null;
}

const HighlightText: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(Recommendation:)/);
    return (
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {parts.map((part, index) =>
                part === 'Recommendation:' ? (
                    <strong key={index} className="font-semibold text-slate-800 dark:text-slate-200">
                        {part}
                    </strong>
                ) : (
                    <React.Fragment key={index}>{part}</React.Fragment>
                )
            )}
        </p>
    );
};

export const KeyHighlights: React.FC<KeyHighlightsProps> = ({ highlights, isLoading, error }) => {
  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0">
        <span className="text-sky-500 dark:text-sky-400">💡</span>
        <span>Key Highlights</span>
      </h3>

      <div>
          {isLoading && (
            <div className="flex items-center justify-center h-24">
              <SpinnerIcon className="w-8 h-8 text-sky-500 dark:text-sky-400" />
              <p className="ml-3 text-slate-600 dark:text-slate-300">Generating AI Insights...</p>
            </div>
          )}
          {error && (
            <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}
          {!isLoading && !error && highlights.length > 0 && (
            <ul className="space-y-3 max-h-60 overflow-y-auto">
              {highlights.map((highlight, index) => (
                <li key={index} className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-md flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{highlight.emoji}</span>
                  <div>
                    <HighlightText text={highlight.text} />
                  </div>
                </li>
              ))}
            </ul>
          )}
           {!isLoading && !error && highlights.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">No significant highlights could be generated from the current dataset.</p>
          )}
      </div>
    </div>
  );
};