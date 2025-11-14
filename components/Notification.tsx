

import React, { useEffect } from 'react';
import { XIcon } from './icons/XIcon';
import { InfoIcon } from './icons/InfoIcon';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000); // Auto-dismiss after 8 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="max-w-md w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border border-slate-700 animate-fade-in-up">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <InfoIcon className="h-6 w-6 text-sky-400" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-white">Notification</p>
            <p className="mt-1 text-sm text-slate-300">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className="inline-flex text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 rounded-md"
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};