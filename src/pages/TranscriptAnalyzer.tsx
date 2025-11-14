import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (files: FileList) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  }, [disabled, onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };
  
  const borderColor = isDragging ? 'border-sky-500' : 'border-slate-300 dark:border-slate-600';
  const bgColor = isDragging ? 'bg-slate-200/50 dark:bg-slate-700/50' : 'bg-slate-100 dark:bg-slate-800';
  const cursor = disabled ? 'cursor-not-allowed' : 'cursor-pointer';

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full h-40 border-2 ${borderColor} border-dashed rounded-lg ${cursor} ${bgColor} transition-colors duration-300 ease-in-out ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <UploadIcon className="w-8 h-8 mb-3 text-slate-400 dark:text-slate-400" />
        <p className="mb-2 font-semibold text-slate-700 dark:text-slate-300">
          <span className="text-sky-500 dark:text-sky-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">TXT transcripts & optional WAV, MP3, M4A audio</p>
      </div>
      <input 
        id="dropzone-file" 
        type="file" 
        className="hidden" 
        multiple 
        onChange={handleChange} 
        disabled={disabled}
        accept=".txt,.md,text/plain,.wav,.mp3,.m4a,audio/*"
      />
    </label>
  );
};
