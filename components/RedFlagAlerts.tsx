import React from 'react';
import type { RedFlag } from '../types';
import { ComplaintIcon } from './icons/ComplaintIcon';

export const RedFlagAlerts: React.FC<{ redFlags: RedFlag[] }> = ({ redFlags }) => {
    if (redFlags.length === 0) {
        return null;
    }

    return (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-500/30">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                <ComplaintIcon className="w-6 h-6" />
                <span>Flagged for Call Review</span>
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {redFlags.map((flag) => (
                    <div key={flag.callId} className="bg-white dark:bg-slate-800/50 p-3 rounded-md">
                        {flag.quote && (
                            <blockquote className="border-l-2 border-red-400/50 pl-3 text-sm italic text-slate-600 dark:text-slate-400">
                                "{flag.quote}"
                            </blockquote>
                        )}
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-right">
                            Agent: <span className="font-medium text-slate-700 dark:text-slate-300">{flag.agentName}</span> | Call ID: <span className="font-medium text-sky-600 dark:text-sky-400">{flag.callId}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};