import React, { useState, useMemo, useEffect } from 'react';
import type { User, LoginRecord, UserSession } from '../types';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';

const LS_LOGIN_HISTORY_KEY = 'transcript_analyzer_login_history';
const LS_SESSIONS_KEY = 'transcript_analyzer_sessions';

interface LoginSummaryModalProps {
    users: User[];
    isOpen: boolean;
    onClose: () => void;
}

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);

    if (data.length === 0) {
        return <div className="text-center text-slate-500 dark:text-slate-400 py-10">No login data for the selected period.</div>;
    }

    return (
        <div className="space-y-3">
            {data.map(({ label, value }) => (
                <div key={label} className="grid grid-cols-6 items-center gap-2 text-sm" title={`${label}: ${value} login(s)`}>
                    <span className="col-span-2 text-slate-700 dark:text-slate-300 truncate text-right">{label}</span>
                    <div className="col-span-3 bg-slate-200 dark:bg-slate-700 rounded-md h-6">
                        <div
                            className="bg-sky-500 h-6 rounded-md transition-all duration-300 flex items-center justify-end pr-2 text-white font-semibold"
                            style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }}
                        >
                           
                        </div>
                    </div>
                     <span className="col-span-1 text-slate-900 dark:text-white font-semibold">{value}</span>
                </div>
            ))}
        </div>
    );
};

const formatDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
};

const UsageTable: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    if (data.length === 0) {
        return <div className="text-center text-slate-500 dark:text-slate-400 py-10">No usage data for the selected period.</div>;
    }
    return (
        <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                        <th scope="col" className="px-4 py-3">User</th>
                        <th scope="col" className="px-4 py-3 text-right">Total Usage (HH:MM:SS)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {data.map(({ label, value }) => (
                        <tr key={label} className="hover:bg-slate-100 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-3 font-medium">{label}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatDuration(value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export const LoginSummaryModal: React.FC<LoginSummaryModalProps> = ({ users, isOpen, onClose }) => {
    const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [filterType, setFilterType] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));

    useEffect(() => {
        if (isOpen) {
            try {
                const savedHistory = localStorage.getItem(LS_LOGIN_HISTORY_KEY);
                if (savedHistory) setLoginHistory(JSON.parse(savedHistory));

                const savedSessions = localStorage.getItem(LS_SESSIONS_KEY);
                if (savedSessions) setSessions(JSON.parse(savedSessions));
            } catch (err) {
                console.error("Failed to load analytics data:", err);
            }
        }
    }, [isOpen]);

    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        loginHistory.forEach(record => {
            const loginDate = new Date(record.timestamp);
            let matches = false;

            if (filterType === 'day') {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const recordDate = new Date(Date.UTC(loginDate.getUTCFullYear(), loginDate.getUTCMonth(), loginDate.getUTCDate()));
                const selected = new Date(Date.UTC(year, month-1, day));
                 if (recordDate.getTime() === selected.getTime()) {
                    matches = true;
                }
            } else { // month
                const [year, month] = selectedDate.split('-').map(Number);
                if (loginDate.getUTCFullYear() === year && loginDate.getUTCMonth() === month - 1) {
                    matches = true;
                }
            }
            
            if (matches) {
                const userName = userMap.get(record.userId) || record.email;
                counts[userName] = (counts[userName] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a,b) => b.value - a.value);

    }, [loginHistory, users, filterType, selectedDate]);
    
    const usageData = useMemo(() => {
        const usage = new Map<string, number>();
        const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        sessions.forEach(session => {
            if (!session.logoutTimestamp || session.durationSeconds === undefined) return;

            const loginDate = new Date(session.loginTimestamp);
            let matches = false;

            if (filterType === 'day') {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const recordDate = new Date(Date.UTC(loginDate.getUTCFullYear(), loginDate.getUTCMonth(), loginDate.getUTCDate()));
                const selected = new Date(Date.UTC(year, month - 1, day));
                if (recordDate.getTime() === selected.getTime()) {
                    matches = true;
                }
            } else { // month
                const [year, month] = selectedDate.split('-').map(Number);
                if (loginDate.getUTCFullYear() === year && loginDate.getUTCMonth() === month - 1) {
                    matches = true;
                }
            }
            
            if (matches) {
                const userName = userMap.get(session.userId) || 'Unknown User';
                if (typeof userName === 'string') {
                    const currentDuration = usage.get(userName) || 0;
                    usage.set(userName, currentDuration + session.durationSeconds);
                }
            }
        });

        return Array.from(usage.entries())
            .map(([label, value]: [string, number]) => ({ label, value }))
            .sort((a,b) => b.value - a.value);
    }, [sessions, users, filterType, selectedDate]);

    const handleExportCsv = () => {
        const combinedData = new Map<string, { logins: number; duration: number }>();

        chartData.forEach(item => {
            combinedData.set(item.label, { logins: item.value, duration: 0 });
        });

        usageData.forEach(item => {
            if (combinedData.has(item.label)) {
                combinedData.get(item.label)!.duration = item.value;
            } else {
                combinedData.set(item.label, { logins: 0, duration: item.value });
            }
        });

        if (combinedData.size === 0) {
            alert("No data to export for the selected period.");
            return;
        }

        const headers = ['User', 'Total Logins', 'Total Usage Time (HH:MM:SS)'];
        const rows = Array.from(combinedData.entries()).map(([user, data]) => 
            [
                `"${user.replace(/"/g, '""')}"`,
                data.logins,
                formatDuration(data.duration)
            ].join(',')
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `login_summary_${selectedDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-modal-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-6xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 id="summary-modal-title" className="text-xl font-semibold text-slate-900 dark:text-white">
                        User Login Summary
                    </h3>
                    <button onClick={onClose} aria-label="Close modal">
                        <XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"/>
                    </button>
                </div>
                
                <div className="flex items-end gap-4 mb-6">
                    <div>
                        <label htmlFor="filterType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter By</label>
                        <select
                            id="filterType"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'day' | 'month')}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="day">Day</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select {filterType === 'day' ? 'Date' : 'Month'}</label>
                        <input
                            type={filterType === 'day' ? 'date' : 'month'}
                            id="filterDate"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600/80 hover:bg-sky-600 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                        disabled={chartData.length === 0 && usageData.length === 0}
                        aria-label="Export data to CSV"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400 mb-3">Total Logins</h4>
                        <BarChart data={chartData} />
                    </div>
                    <div>
                         <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400 mb-3">Total Usage Time</h4>
                         <UsageTable data={usageData} />
                    </div>
                </div>

            </div>
        </div>
    );
};
