import React, { useState, useEffect } from 'react';

interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {
    const [preset, setPreset] = useState('custom');

    useEffect(() => {
        if (!startDate && !endDate) {
            setPreset('all');
        } else {
            // A simple check to see if we should reset to custom
            // This is not exhaustive but covers most cases
            const today = new Date();
            const todayStr = formatDate(today);
            if (startDate === todayStr && endDate === todayStr) {
                setPreset('today');
            } // ... more checks could be added here if needed, but 'custom' is a safe default.
        }
    }, [startDate, endDate]);


    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setPreset(value);

        const today = new Date();
        let newStartDate = '';
        let newEndDate = '';

        switch (value) {
            case 'today':
                newStartDate = newEndDate = formatDate(today);
                break;
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                newStartDate = newEndDate = formatDate(yesterday);
                break;
            case 'last7':
                newEndDate = formatDate(today);
                const last7 = new Date();
                last7.setDate(today.getDate() - 6);
                newStartDate = formatDate(last7);
                break;
            case 'last30':
                newEndDate = formatDate(today);
                const last30 = new Date();
                last30.setDate(today.getDate() - 29);
                newStartDate = formatDate(last30);
                break;
            case 'prevMonth':
                const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                newStartDate = formatDate(prevMonthStart);
                const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                newEndDate = formatDate(endOfPrevMonth);
                break;
            case 'custom':
                // Don't change dates, let user pick.
                return;
            case 'all':
                // Handled by default empty strings
                break;
        }

        onStartDateChange(newStartDate);
        onEndDateChange(newEndDate);
    };
    
    const handleDateInputChange = (setter: (date: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
        setPreset('custom');
    };

    return (
        <div className="flex items-end gap-x-4 gap-y-2 flex-wrap">
            <div className="flex items-center gap-2">
                <label htmlFor="datePreset" className="text-sm text-slate-600 dark:text-slate-300 shrink-0">Date Range:</label>
                <select 
                    id="datePreset"
                    value={preset}
                    onChange={handlePresetChange}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="prevMonth">Previous Month</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="startDate" className="text-sm text-slate-600 dark:text-slate-300 shrink-0">From:</label>
                <input 
                    type="date" 
                    id="startDate"
                    value={startDate}
                    onChange={handleDateInputChange(onStartDateChange)}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="endDate" className="text-sm text-slate-600 dark:text-slate-300 shrink-0">To:</label>
                <input 
                    type="date" 
                    id="endDate"
                    value={endDate}
                    onChange={handleDateInputChange(onEndDateChange)}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>
        </div>
    );
};