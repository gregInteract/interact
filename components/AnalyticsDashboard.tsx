import React, { useMemo, useState } from 'react';
import type { AllTroubleshootingFeedback, ResultItem, TroubleshootingStatus } from '../types';
import { generateDashboardMetrics, parseDurationToSeconds, findRedFlags, findCommendations } from '../utils/exportUtils';
import { PhoneIcon } from './icons/PhoneIcon';
import { ClockIcon } from './icons/ClockIcon';
import { KeyHighlights } from './KeyHighlights';
import { DateRangeFilter } from './DateRangeFilter';
import { SortIcon } from './icons/SortIcon';
import { RedFlagAlerts } from './RedFlagAlerts';
import { Commendations } from './Commendations';
import { DashboardIcon } from './icons/DashboardIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { OwnershipIcon } from './icons/OwnershipIcon';
import { EmpathyIcon } from './icons/EmpathyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { UnresolvedCallsChart } from './UnresolvedCallsChart';
import { UnresolvedCallsModal } from './UnresolvedCallsModal';
import { ReviewModal } from './ReviewModal';
import { HappyFaceIcon } from './icons/HappyFaceIcon';
import { SadFaceIcon } from './icons/SadFaceIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface AnalyticsDashboardProps {
  data: ResultItem[];
  keyHighlights: {emoji: string, text: string}[];
  highlightsLoading: boolean;
  highlightsError: string | null;
  notes: Record<string, string>;
  onNoteChange: (contentHash: string, newNote: string) => void;
  troubleshootingFeedback: AllTroubleshootingFeedback;
  onTroubleshootingFeedbackChange: (contentHash: string, stepIndex: number, status: TroubleshootingStatus) => void;
  campaign: string;
}

type DriverMetric = {
    driver: string;
    count: number;
    percentOfTotal: number;
    avgDuration: number; // in seconds
    avgProcedureFlowScore: number;
    avgOwnershipScore: number;
    avgEmpathyScore: number;
    avgVerificationScore: number;
    resolutionRate: number;
    repeatPercent: number;
};

const TableHeader: React.FC<{
    columnKey: keyof DriverMetric;
    title: string;
    sortConfig: { key: keyof DriverMetric; direction: 'ascending' | 'descending' } | null;
    requestSort: (key: keyof DriverMetric) => void;
    className?: string;
    titleAttr?: string;
}> = ({ columnKey, title, sortConfig, requestSort, className = '', titleAttr }) => (
    <th className={`px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/40 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider ${className}`}>
        <button className="flex items-center group" onClick={() => requestSort(columnKey)} title={titleAttr}>
            <span>{title}</span>
            <SortIcon direction={sortConfig?.key === columnKey ? sortConfig.direction : undefined} />
        </button>
    </th>
);

const formatSecondsToMMSS = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const DashboardMetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactElement<{ className?: string }>;
    color: 'yellow' | 'red' | 'blue' | 'green';
}> = ({ title, value, icon, color }) => {
    const colorClasses = {
        green: { border: 'border-green-500/60', iconBg: 'bg-green-500/10', text: 'text-green-400' },
        yellow: { border: 'border-yellow-600/60', iconBg: 'bg-yellow-500/10', text: 'text-yellow-400' },
        red: { border: 'border-red-500/60', iconBg: 'bg-red-500/10', text: 'text-red-400' },
        blue: { border: 'border-sky-500/60', iconBg: 'bg-sky-500/10', text: 'text-sky-400' },
    };

    const selectedColor = colorClasses[color];

    return (
        <div className={`bg-slate-900/40 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-4 border ${selectedColor.border}`}>
            <div className={`p-3 rounded-full ${selectedColor.iconBg}`}>
                {React.cloneElement(icon, { className: `w-8 h-8 ${selectedColor.text}` })}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className={`text-3xl font-bold ${selectedColor.text}`}>{value}</p>
            </div>
        </div>
    );
};


export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data, keyHighlights, highlightsLoading, highlightsError, notes, onNoteChange, troubleshootingFeedback, onTroubleshootingFeedbackChange, campaign }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [callDriverFilter, setCallDriverFilter] = useState<string>('all');

    const [unresolvedCallsModalData, setUnresolvedCallsModalData] = useState<{ reason: string; calls: ResultItem[] } | null>(null);
    const [callDriverModalData, setCallDriverModalData] = useState<{ driver: string; calls: ResultItem[] } | null>(null);
    const [reviewingItemFromDashboard, setReviewingItemFromDashboard] = useState<ResultItem | null>(null);

    const uniqueCallDrivers = useMemo(() => [...new Set(data.map(item => item.result.callType))].sort(), [data]);

    const dateFilteredData = useMemo(() => {
        return data.filter(item => {
            if (startDate) {
                const callDate = new Date(item.result.callDetails.callDateTime);
                const start = new Date(startDate);
                start.setUTCHours(0, 0, 0, 0); 
                if (callDate < start) return false;
            }
            if (endDate) {
                const callDate = new Date(item.result.callDetails.callDateTime);
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999); 
                if (callDate > end) return false;
            }
            if (callDriverFilter !== 'all' && item.result.callType !== callDriverFilter) {
                return false;
            }
            return true;
        });
    }, [data, startDate, endDate, callDriverFilter]);

    const analytics = useMemo(() => {
        const dataToAnalyze = dateFilteredData.map(item => item.result);
        return generateDashboardMetrics(dataToAnalyze);
    }, [dateFilteredData]);

    const redFlags = useMemo(() => findRedFlags(dateFilteredData), [dateFilteredData]);
    const commendations = useMemo(() => findCommendations(dateFilteredData), [dateFilteredData]);

    const callDriverMetrics = useMemo(() => {
        const fullDataset = callDriverFilter === 'all' ? dateFilteredData : data; // Use all data for context unless filtered
        if (fullDataset.length === 0) {
            return { data: [], maxValues: { percentOfTotal: 0, avgDuration: 0 } };
        }

        const metricsByDriver: Record<string, {
            count: number;
            totalDurationSeconds: number;
            totalProcedureFlowScore: number;
            totalOwnershipScore: number;
            totalEmpathyScore: number;
            totalVerificationScore: number;
            resolvedCount: number;
            repeatCallCount: number;
        }> = {};

        for (const item of fullDataset) {
            const driver = item.result.callType;
            if (!metricsByDriver[driver]) {
                metricsByDriver[driver] = {
                    count: 0,
                    totalDurationSeconds: 0,
                    totalProcedureFlowScore: 0,
                    totalOwnershipScore: 0,
                    totalEmpathyScore: 0,
                    totalVerificationScore: 0,
                    resolvedCount: 0,
                    repeatCallCount: 0,
                };
            }

            const metrics = metricsByDriver[driver];
            metrics.count++;
            metrics.totalDurationSeconds += parseDurationToSeconds(item.result.callDetails.callDuration);
            metrics.totalProcedureFlowScore += item.result.agentPerformance.corePillars.procedureFlow?.adherenceScore || 0;
            metrics.totalOwnershipScore += item.result.agentPerformance.corePillars.ownership?.ownershipScore || 0;
            metrics.totalEmpathyScore += item.result.agentPerformance.corePillars.empathy.empathyScore;
            metrics.totalVerificationScore += item.result.agentPerformance.corePillars.accountVerification?.verificationScore || 0;
            if(item.result.resolution.issueResolved) {
                metrics.resolvedCount++;
            }
            if (item.result.isRepeatCall) {
                metrics.repeatCallCount++;
            }
        }

        const totalCalls = fullDataset.length;
        const aggregatedData: DriverMetric[] = Object.entries(metricsByDriver).map(([driver, metrics]) => ({
            driver,
            count: metrics.count,
            percentOfTotal: (metrics.count / totalCalls) * 100,
            avgDuration: metrics.count > 0 ? metrics.totalDurationSeconds / metrics.count : 0,
            avgProcedureFlowScore: metrics.count > 0 ? metrics.totalProcedureFlowScore / metrics.count : 0,
            avgOwnershipScore: metrics.count > 0 ? metrics.totalOwnershipScore / metrics.count : 0,
            avgEmpathyScore: metrics.count > 0 ? metrics.totalEmpathyScore / metrics.count : 0,
            avgVerificationScore: metrics.count > 0 ? metrics.totalVerificationScore / metrics.count : 0,
            resolutionRate: metrics.count > 0 ? (metrics.resolvedCount / metrics.count) * 100 : 0,
            repeatPercent: metrics.count > 0 ? (metrics.repeatCallCount / metrics.count) * 100 : 0,
        }));
        
        const maxValues = {
            percentOfTotal: Math.max(...aggregatedData.map(d => d.percentOfTotal), 0),
            avgDuration: Math.max(...aggregatedData.map(d => d.avgDuration), 0),
        };

        return { data: aggregatedData, maxValues };
    }, [dateFilteredData, callDriverFilter, data]);


    const [driverSortConfig, setDriverSortConfig] = useState< { key: keyof DriverMetric; direction: 'ascending' | 'descending' } | null>({ key: 'count', direction: 'descending' });
    
    const requestDriverSort = (key: keyof DriverMetric) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (driverSortConfig && driverSortConfig.key === key && driverSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setDriverSortConfig({ key, direction });
    };

    const sortedDriverMetrics = useMemo(() => {
        let sortableItems = [...callDriverMetrics.data];
        if (driverSortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[driverSortConfig.key] < b[driverSortConfig.key]) {
                    return driverSortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[driverSortConfig.key] > b[driverSortConfig.key]) {
                    return driverSortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [callDriverMetrics.data, driverSortConfig]);
    
    const handleClearFilter = () => {
        setStartDate('');
        setEndDate('');
        setCallDriverFilter('all');
    };

    const handleReasonClick = (reason: string) => {
        const callsForReason = dateFilteredData.filter(item => item.result.resolution.reasonCategory === reason);
        setUnresolvedCallsModalData({ reason, calls: callsForReason });
    };
    
    const handleDriverClick = (driver: string) => {
        const callsForDriver = dateFilteredData.filter(item => item.result.callType === driver);
        setCallDriverModalData({ driver, calls: callsForDriver });
    };

    const handleSelectCallForReview = (callId: string) => {
        const callToReview = data.find(item => item.result.callDetails.callId === callId);
        if (callToReview) {
            setUnresolvedCallsModalData(null);
            setCallDriverModalData(null);
            setReviewingItemFromDashboard(callToReview);
        }
    };

    const getMetricColor = (value: number, thresholds = { high: 85, mid: 70}) => {
        if (value >= thresholds.high) return 'green';
        if (value >= thresholds.mid) return 'yellow';
        return 'red';
    };

    return (
        <div className="space-y-8">
            {reviewingItemFromDashboard && (
                <ReviewModal 
                    item={reviewingItemFromDashboard} 
                    onClose={() => setReviewingItemFromDashboard(null)} 
                    note={notes[reviewingItemFromDashboard.contentHash] || ''}
                    onNoteChange={onNoteChange}
                    troubleshootingFeedback={troubleshootingFeedback[reviewingItemFromDashboard.contentHash] || {}}
                    onTroubleshootingFeedbackChange={onTroubleshootingFeedbackChange}
                    campaign={campaign}
                />
            )}
            
            {unresolvedCallsModalData && (
                <UnresolvedCallsModal
                    isOpen={!!unresolvedCallsModalData}
                    onClose={() => setUnresolvedCallsModalData(null)}
                    title={campaign === 'banking' ? 'Calls for Dissatisfaction Reason' : 'Unresolved Calls'}
                    reason={unresolvedCallsModalData.reason}
                    calls={unresolvedCallsModalData.calls}
                    onSelectCall={handleSelectCallForReview}
                />
            )}
            
            {callDriverModalData && (
                <UnresolvedCallsModal
                    isOpen={!!callDriverModalData}
                    onClose={() => setCallDriverModalData(null)}
                    title="Calls for Driver"
                    reason={callDriverModalData.driver}
                    calls={callDriverModalData.calls}
                    onSelectCall={handleSelectCallForReview}
                />
            )}


            <div className="flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                    <DashboardIcon className="w-10 h-10 text-sky-500 dark:text-sky-400" />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h2>
                </div>
                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label htmlFor="callDriverFilter" className="text-sm text-slate-600 dark:text-slate-300 shrink-0">Call Driver:</label>
                        <select
                            id="callDriverFilter"
                            value={callDriverFilter}
                            onChange={(e) => setCallDriverFilter(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="all">All Drivers</option>
                            {uniqueCallDrivers.map(driver => (
                                <option key={driver} value={driver}>{driver}</option>
                            ))}
                        </select>
                    </div>
                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                    <button 
                        onClick={handleClearFilter}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-600/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-md transition-colors text-sm"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
            
            {data.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">No data available. Upload some transcripts to get started.</p>
                </div>
            ) : analytics.totalCalls === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Results Found</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">No call data matches the selected filters.</p>
                </div>
            ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {campaign === 'banking' ? (
                    <>
                        <DashboardMetricCard title="Total Calls Analyzed" value={analytics.totalCalls} icon={<PhoneIcon />} color="blue" />
                        <DashboardMetricCard title="Avg. Call Duration" value={analytics.avgDuration} icon={<ClockIcon />} color="blue" />
                        <DashboardMetricCard title="Verification Score" value={`${analytics.analyticsSummary.avgVerificationScore.toFixed(1)}%`} icon={<ShieldCheckIcon />} color={getMetricColor(analytics.analyticsSummary.avgVerificationScore)} />
                        <DashboardMetricCard title="Empathy" value={`${analytics.avgEmpathyScore.toFixed(1)}%`} icon={<EmpathyIcon />} color={getMetricColor(analytics.avgEmpathyScore)} />
                        <DashboardMetricCard title="Positive Sentiment" value={`${analytics.sentiment.positivePercent}%`} icon={<HappyFaceIcon />} color={analytics.sentiment.positivePercent >= 80 ? 'green' : 'red'} />
                        <DashboardMetricCard title="Negative Sentiment" value={`${analytics.sentiment.negativePercent}%`} icon={<SadFaceIcon />} color="red" />
                    </>
                ) : (
                    <>
                        <DashboardMetricCard title="Total Calls Analyzed" value={analytics.totalCalls} icon={<PhoneIcon />} color="blue" />
                        <DashboardMetricCard title="Avg. Call Duration" value={analytics.avgDuration} icon={<ClockIcon />} color="blue" />
                        <DashboardMetricCard title="Resolution Rate" value={`${analytics.analyticsSummary.resolutionRate.toFixed(1)}%`} icon={<CheckIcon />} color={getMetricColor(analytics.analyticsSummary.resolutionRate, { high: 80, mid: 60 })} />
                        <DashboardMetricCard title="Procedure Flow" value={`${analytics.avgProcedureFlowScore.toFixed(1)}%`} icon={<BookOpenIcon />} color={getMetricColor(analytics.avgProcedureFlowScore)} />
                        <DashboardMetricCard title="Ownership" value={`${analytics.avgOwnershipScore.toFixed(1)}%`} icon={<OwnershipIcon />} color={getMetricColor(analytics.avgOwnershipScore)} />
                        <DashboardMetricCard title="Empathy" value={`${analytics.avgEmpathyScore.toFixed(1)}%`} icon={<EmpathyIcon />} color={getMetricColor(analytics.avgEmpathyScore)} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <KeyHighlights 
                    highlights={keyHighlights}
                    isLoading={highlightsLoading}
                    error={highlightsError}
                />
                <UnresolvedCallsChart 
                  title={campaign === 'banking' ? 'Top Reasons for Dissatisfaction' : 'Top Reasons for Unresolved Calls'}
                  data={campaign === 'banking' ? analytics.analyticsSummary.dissatisfactionReasonCounts || [] : analytics.analyticsSummary.unresolvedReasonCounts || []}
                  onReasonClick={handleReasonClick}
                />
            </div>

            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-4">
                    <span>Call Driver Analysis</span>
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y-2 divide-slate-200 dark:divide-slate-700">
                        <thead>
                            <tr>
                                <TableHeader columnKey="driver" title="Call Driver" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                <TableHeader columnKey="count" title="Volume" sortConfig={driverSortConfig} requestSort={requestDriverSort} className="text-center" />
                                <TableHeader columnKey="percentOfTotal" title="% Grand Total" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                <TableHeader columnKey="resolutionRate" title="Resolution Rate" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                <TableHeader columnKey="avgDuration" title="Avg. Duration" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                {campaign === 'banking' ? (
                                    <>
                                        <TableHeader columnKey="avgVerificationScore" title="Verif. %" sortConfig={driverSortConfig} requestSort={requestDriverSort} titleAttr="Average Verification Score" />
                                        <TableHeader columnKey="avgEmpathyScore" title="Emp. %" sortConfig={driverSortConfig} requestSort={requestDriverSort} titleAttr="Average Empathy Score" />
                                    </>
                                ) : (
                                    <>
                                        <TableHeader columnKey="avgProcedureFlowScore" title="Flow %" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                        <TableHeader columnKey="avgOwnershipScore" title="Own. %" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                        <TableHeader columnKey="avgEmpathyScore" title="Emp. %" sortConfig={driverSortConfig} requestSort={requestDriverSort} />
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                            {sortedDriverMetrics.length > 0 ? sortedDriverMetrics.map((item, index) => (
                                <tr 
                                    key={item.driver}
                                    onClick={() => handleDriverClick(item.driver)}
                                    className={`transition-colors duration-200 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 ${
                                        (index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-transparent')
                                    }`}
                                >
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-sky-600 dark:text-sky-300">
                                        {item.driver}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 text-center">{item.count.toLocaleString()}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 min-w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-right">{item.percentOfTotal.toFixed(1)}%</span>
                                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-sm h-4">
                                                <div className="bg-sky-500 h-4 rounded-sm" style={{ width: `${callDriverMetrics.maxValues.percentOfTotal > 0 ? (item.percentOfTotal / callDriverMetrics.maxValues.percentOfTotal) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.resolutionRate.toFixed(1)}%</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 min-w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-right">{formatSecondsToMMSS(item.avgDuration)}</span>
                                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-sm h-4">
                                                <div className="bg-violet-500 h-4 rounded-sm" style={{ width: `${callDriverMetrics.maxValues.avgDuration > 0 ? (item.avgDuration / callDriverMetrics.maxValues.avgDuration) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    {campaign === 'banking' ? (
                                        <>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{(item.avgVerificationScore || 0).toFixed(1)}%</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.avgEmpathyScore.toFixed(1)}%</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.avgProcedureFlowScore.toFixed(1)}%</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.avgOwnershipScore.toFixed(1)}%</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.avgEmpathyScore.toFixed(1)}%</td>
                                        </>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={campaign === 'banking' ? 7 : 8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        No call driver data available for the selected period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {(redFlags.length > 0 || commendations.length > 0) &&
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-300 dark:border-slate-700">
                  <Commendations commendations={commendations} />
                  <RedFlagAlerts redFlags={redFlags} />
              </div>
            }
            </>
            )}
        </div>
    );
};