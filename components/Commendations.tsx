import React from 'react';
import type { Commendation } from '../types';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';

export const Commendations: React.FC<{ commendations: Commendation[] }> = ({ commendations }) => {
    if (commendations.length === 0) {
        return null;
    }

    return (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-500/30">
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
                <ThumbsUpIcon className="w-6 h-6" />
                <span>Commendable Calls: Agent Excellence</span>
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {commendations.map((item) => (
                    <div key={item.callId} className="bg-white dark:bg-slate-800/50 p-3 rounded-md">
                        <blockquote className="border-l-2 border-green-400/50 pl-3 text-sm italic text-slate-600 dark:text-slate-300">
                            "{item.quote}"
                        </blockquote>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-right">
                            Agent: <span className="font-medium text-slate-700 dark:text-slate-300">{item.agentName}</span> | Call ID: <span className="font-medium text-sky-600 dark:text-sky-400">{item.callId}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};