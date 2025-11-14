import React from 'react';
import type { ResultItem } from '../types';
import { XIcon } from './icons/XIcon';
import { safeFormatDateOnly } from '../utils/exportUtils';

interface UnresolvedCallsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    reason: string;
    calls: ResultItem[];
    onSelectCall: (callId: string) => void;
}

export const UnresolvedCallsModal: React.FC<UnresolvedCallsModalProps> = ({ isOpen, onClose, title, reason, calls, onSelectCall }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unresolved-calls-modal-title"
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 id="unresolved-calls-modal-title" className="text-xl font-semibold text-slate-900 dark:text-white truncate pr-4">
                        {title}: <span className="text-sky-500 dark:text-sky-400">{reason}</span>
                    </h3>
                    <button onClick={onClose} aria-label="Close modal">
                        <XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-grow custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3">Call ID</th>
                                <th scope="col" className="px-4 py-3">Agent Name</th>
                                <th scope="col" className="px-4 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {calls.map(call => (
                                <tr key={call.contentHash} className="hover:bg-slate-100 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => onSelectCall(call.result.callDetails.callId)}
                                            className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
                                        >
                                            {call.result.callDetails.callId}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">{call.result.callDetails.agentName}</td>
                                    <td className="px-4 py-3">{safeFormatDateOnly(call.result.callDetails.callDateTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};