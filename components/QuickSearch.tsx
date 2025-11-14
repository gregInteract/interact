import React, { useState, useMemo } from 'react';
import type { ResultItem, User, AllTroubleshootingFeedback, TroubleshootingStatus } from '../types';
import { formatAllAnalysesAsCsv, calculateQaScores, safeGetTime, safeFormatDateOnly } from '../utils/exportUtils';
import { DownloadIcon } from './icons/DownloadIcon';
import { SortIcon } from './icons/SortIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { DateRangeFilter } from './DateRangeFilter';
import { ReviewModal } from './ReviewModal';
import { QuickSearchIcon } from './icons/QuickSearchIcon';

type SortConfig = { key: string; direction: 'ascending' | 'descending' };

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj);
};

const parseDurationToSeconds = (durationStr: string | null): number => {
    if (!durationStr || !/^\d+:\d+$/.test(durationStr)) return 0;
    const parts = durationStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
};

const TableHeader: React.FC<{
    sortKey: string;
    title: string;
    sortConfig: SortConfig | null;
    requestSort: (key: string) => void;
    className?: string;
    titleAttr?: string;
}> = ({ sortKey, title, sortConfig, requestSort, className = '', titleAttr }) => (
    <th scope="col" className={`px-4 py-3 ${className}`}>
        <button onClick={() => requestSort(sortKey)} className="flex items-center" title={titleAttr}>
            {title}
            <SortIcon direction={sortConfig?.key === sortKey ? sortConfig.direction : undefined} />
        </button>
    </th>
);

const BooleanCell: React.FC<{ value: boolean; isApplicable?: boolean }> = ({ value, isApplicable = true }) => {
    if (!isApplicable) {
        return <span className="text-slate-400 dark:text-slate-500">N/A</span>;
    }
    return value ? <CheckIcon className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto" /> : <XIcon className="w-5 h-5 text-red-500 dark:text-red-400 mx-auto" />;
};

export const SearchAndReview: React.FC<{ 
    data: ResultItem[], 
    allUsers: User[], 
    currentUser: User, 
    reviewedCalls: Record<string, string>,
    onToggleReviewed: (contentHash: string) => void,
    notes: Record<string, string>;
    onNoteChange: (contentHash: string, newNote: string) => void;
    troubleshootingFeedback: AllTroubleshootingFeedback;
    onTroubleshootingFeedbackChange: (contentHash: string, stepIndex: number, status: TroubleshootingStatus) => void;
    campaign: string;
}> = ({ data, allUsers, currentUser, reviewedCalls, onToggleReviewed, notes, onNoteChange, troubleshootingFeedback, onTroubleshootingFeedbackChange, campaign }) => {
    const [callId, setCallId] = useState('');
    const [agentName, setAgentName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'result.callDetails.callDateTime', direction: 'descending' });
    const [reviewingItem, setReviewingItem] = useState<ResultItem | null>(null);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [allUsers]);

    const handleClearFilters = () => {
        setCallId('');
        setAgentName('');
        setStartDate('');
        setEndDate('');
    };

    const filteredAndSortedData = useMemo(() => {
        let filtered = [...data].map(item => ({
            ...item,
            qaScores: calculateQaScores(item.result),
        }));

        if (callId) {
            filtered = filtered.filter(item => item.result.callDetails.callId.toLowerCase().includes(callId.toLowerCase()));
        }
        if (agentName) {
            filtered = filtered.filter(item => item.result.callDetails.agentName.toLowerCase().includes(agentName.toLowerCase()));
        }
        if (startDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);
            filtered = filtered.filter(item => {
                const callDate = new Date(item.result.callDetails.callDateTime);
                return !isNaN(callDate.getTime()) && callDate >= start;
            });
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            filtered = filtered.filter(item => {
                const callDate = new Date(item.result.callDetails.callDateTime);
                return !isNaN(callDate.getTime()) && callDate <= end;
            });
        }


        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'result.callDetails.callDuration') {
                    aValue = parseDurationToSeconds(getNestedValue(a, sortConfig.key));
                    bValue = parseDurationToSeconds(getNestedValue(b, sortConfig.key));
                } else if (sortConfig.key === 'result.callDetails.callDateTime') {
                    aValue = safeGetTime(getNestedValue(a, sortConfig.key));
                    bValue = safeGetTime(getNestedValue(b, sortConfig.key));
                }
                else {
                    aValue = getNestedValue(a, sortConfig.key);
                    bValue = getNestedValue(b, sortConfig.key);
                }
                
                if (aValue === null || aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (bValue === null || aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [data, callId, agentName, startDate, endDate, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = () => {
        if (filteredAndSortedData.length === 0) {
            alert("No data to export for the current search criteria.");
            return;
        }
        const csvContent = formatAllAnalysesAsCsv(filteredAndSortedData.map(item => item.result));
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call_search_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            {reviewingItem && (
                <ReviewModal 
                    item={reviewingItem} 
                    onClose={() => setReviewingItem(null)} 
                    note={notes[reviewingItem.contentHash] || ''}
                    onNoteChange={onNoteChange}
                    troubleshootingFeedback={troubleshootingFeedback[reviewingItem.contentHash] || {}}
                    onTroubleshootingFeedbackChange={onTroubleshootingFeedbackChange}
                    campaign={campaign}
                />
            )}

            <div className="flex items-center gap-4">
                <QuickSearchIcon className="w-10 h-10 text-sky-500 dark:text-sky-400" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Search &amp; Review</h2>
            </div>
            
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label htmlFor="callId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Call ID</label>
                            <input
                                type="text"
                                id="callId"
                                name="callId"
                                value={callId}
                                onChange={(e) => setCallId(e.target.value)}
                                placeholder="Enter Call ID..."
                                className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="agentName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Agent Name</label>
                            <input
                                type="text"
                                id="agentName"
                                name="agentName"
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                placeholder="Enter Agent Name..."
                                className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-600/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-md transition-colors text-sm"
                            >
                                Clear Search
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={filteredAndSortedData.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-600/80 hover:bg-sky-600 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Export Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[1800px] text-sm text-left text-slate-700 dark:text-slate-300">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-center">Actions</th>
                            <th scope="col" className="px-4 py-3 text-center">Status</th>
                            <TableHeader sortKey="result.callDetails.callId" title="Call ID" sortConfig={sortConfig} requestSort={requestSort} />
                            <TableHeader sortKey="result.callDetails.callDateTime" title="Call Date" sortConfig={sortConfig} requestSort={requestSort} />
                            <TableHeader sortKey="result.callDetails.agentName" title="Agent" sortConfig={sortConfig} requestSort={requestSort} />
                            <TableHeader sortKey="result.resolution.issueResolved" title="Resolved" sortConfig={sortConfig} requestSort={requestSort} className="text-center"/>
                            <TableHeader sortKey="result.callDetails.callDuration" title="Duration" sortConfig={sortConfig} requestSort={requestSort} />
                            <TableHeader sortKey="result.callType" title="Call Type" sortConfig={sortConfig} requestSort={requestSort} />
                            <TableHeader sortKey="qaScores.total.score" title="Quality %" sortConfig={sortConfig} requestSort={requestSort} className="text-center"/>
                            <TableHeader sortKey="qaScores.procedureFlow.score" title="Flow %" sortConfig={sortConfig} requestSort={requestSort} className="text-center"/>
                            <TableHeader sortKey="qaScores.ownership.score" title="Own. %" sortConfig={sortConfig} requestSort={requestSort} className="text-center"/>
                            <TableHeader sortKey="qaScores.empathy.score" title="Emp. %" sortConfig={sortConfig} requestSort={requestSort} className="text-center"/>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedData.length > 0 ? (
                            filteredAndSortedData.map((item) => {
                                const { result, qaScores } = item;
                                const totalPercent = qaScores.total.score;
                                const flowPercent = qaScores.procedureFlow.score;
                                const ownPercent = qaScores.ownership.score;
                                const empPercent = qaScores.empathy.score;
                                
                                const reviewerId = reviewedCalls[item.contentHash];
                                const isReviewed = !!reviewerId;
                                const reviewerName = reviewerId ? userMap.get(reviewerId) || 'Unknown User' : '';
                                const canToggle = !isReviewed || reviewerId === currentUser.id;
                                
                                return (
                                    <tr key={result.callDetails.callId} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-opacity ${isReviewed ? 'opacity-70 hover:opacity-100' : ''}`}>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => setReviewingItem(item)} className="px-4 py-1.5 bg-sky-100 dark:bg-sky-800/70 hover:bg-sky-200 dark:hover:bg-sky-700 rounded-md text-sky-700 dark:text-sky-200 text-sm whitespace-nowrap">
                                                Review Call
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onToggleReviewed(item.contentHash)}
                                                disabled={!canToggle}
                                                title={
                                                    !canToggle 
                                                    ? `Reviewed by ${reviewerName}. Can only be unmarked by them.` 
                                                    : isReviewed 
                                                        ? 'Click to unmark as reviewed' 
                                                        : 'Mark call as reviewed'
                                                }
                                                className={`flex items-center justify-center gap-1.5 w-full max-w-[150px] mx-auto px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                                    isReviewed
                                                    ? 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                } ${
                                                    canToggle 
                                                    ? (isReviewed ? 'hover:bg-green-200 dark:hover:bg-green-800' : 'hover:bg-slate-300 dark:hover:bg-slate-600')
                                                    : 'cursor-not-allowed opacity-80'
                                                }`}
                                                aria-label={
                                                    !canToggle 
                                                    ? `Reviewed by ${reviewerName}` 
                                                    : isReviewed 
                                                        ? 'Mark as not reviewed' 
                                                        : 'Mark as reviewed'
                                                }
                                            >
                                                {isReviewed && <CheckIcon className="w-4 h-4" />}
                                                <span className="truncate">
                                                    {isReviewed 
                                                        ? (canToggle ? 'Reviewed' : `By: ${reviewerName.split(' ')[0]}`) 
                                                        : 'Mark as Reviewed'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">{result.callDetails.callId}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{safeFormatDateOnly(result.callDetails.callDateTime)}</td>
                                        <td className="px-4 py-3">{result.callDetails.agentName}</td>
                                        <td className="px-4 py-3 text-center"><BooleanCell value={result.resolution.issueResolved} /></td>
                                        <td className="px-4 py-3">{result.callDetails.callDuration}</td>
                                        <td className="px-4 py-3">{result.callType}</td>
                                        <td className="px-4 py-3 text-center font-bold">{totalPercent.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-center">{flowPercent}%</td>
                                        <td className="px-4 py-3 text-center">{ownPercent}%</td>
                                        <td className="px-4 py-3 text-center">{empPercent}%</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={13} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                    No records match the current search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};