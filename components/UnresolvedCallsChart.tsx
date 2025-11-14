import React, { useMemo } from 'react';
import { BarChartIcon } from './icons/BarChartIcon';

interface UnresolvedCallsChartProps {
  data: { reason: string; count: number }[];
  onReasonClick: (reason: string) => void;
  title: string;
}

export const UnresolvedCallsChart: React.FC<UnresolvedCallsChartProps> = ({ data, onReasonClick, title }) => {
  const topReasons = useMemo(() => data.slice(0, 7), [data]); // Show top 7 reasons
  const maxCount = useMemo(() => Math.max(...topReasons.map(d => d.count), 0), [topReasons]);

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 h-full">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <BarChartIcon className="w-6 h-6 text-sky-500 dark:text-sky-400" />
        <span>{title}</span>
      </h3>
      {topReasons.length > 0 ? (
        <div className="space-y-2">
          {topReasons.map(({ reason, count }) => (
            <button 
              key={reason} 
              className="grid grid-cols-12 items-center gap-2 text-sm w-full text-left p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors" 
              title={`View calls for: ${reason}`}
              onClick={() => onReasonClick(reason)}
            >
              <span className="col-span-5 text-slate-600 dark:text-slate-300 truncate text-right pr-2">{reason}</span>
              <div className="col-span-6 bg-slate-200 dark:bg-slate-700 rounded-sm h-5">
                <div
                  className="bg-sky-500 h-5 rounded-sm transition-all duration-300"
                  style={{ width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                />
              </div>
              <span className="col-span-1 text-slate-800 dark:text-white font-semibold text-left">{count}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full min-h-[200px]">
             <p className="text-slate-500 dark:text-slate-400 text-center py-4">No relevant data found for the selected period.</p>
        </div>
      )}
    </div>
  );
};