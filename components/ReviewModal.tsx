import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ResultItem, TroubleshootingFeedback, TroubleshootingStatus } from '../types';
import { AnalysisCard } from './AnalysisCard';
import { XIcon } from './icons/XIcon';
import { splitTranscript } from '../utils/exportUtils';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { formatTime } from '../utils/audioUtils';

interface ReviewModalProps {
    item: ResultItem;
    onClose: () => void;
    note: string;
    onNoteChange: (contentHash: string, newNote: string) => void;
    troubleshootingFeedback: TroubleshootingFeedback;
    onTroubleshootingFeedbackChange: (contentHash: string, stepIndex: number, status: TroubleshootingStatus) => void;
    campaign: string;
}

const TranscriptDisplay: React.FC<{ transcriptContent: string }> = ({ transcriptContent }) => {
    const { dialogue } = useMemo(() => splitTranscript(transcriptContent), [transcriptContent]);

    const turns = useMemo(() => {
        return dialogue.split(/(?=^Agent:|^Customer:)/m).filter(turn => turn.trim() !== '');
    }, [dialogue]);

    return (
        <div className="space-y-4">
            {turns.map((turn, index) => {
                const isAgent = turn.startsWith('Agent:');
                const bubbleClass = isAgent ? 'transcript-bubble-agent' : 'transcript-bubble-customer';
                
                // Find the first colon and separate the speaker from the text
                const colonIndex = turn.indexOf(':');
                let speaker = '';
                let text = turn;

                if (colonIndex !== -1) {
                    speaker = turn.substring(0, colonIndex + 1);
                    text = turn.substring(colonIndex + 1).trim();
                }

                return (
                    <div key={index} className={`transcript-bubble ${bubbleClass}`}>
                        <p className="font-semibold">{speaker}</p>
                        <p>{text}</p>
                    </div>
                );
            })}
        </div>
    );
};


export const ReviewModal: React.FC<ReviewModalProps> = ({ item, onClose, note, onNoteChange, troubleshootingFeedback, onTroubleshootingFeedbackChange, campaign }) => {
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const analysisContainerRef = useRef<HTMLDivElement>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };
    
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            audio.pause();
        } else {
            if (audio.ended) {
               audio.currentTime = 0;
            }
            audio.play().catch(e => console.error("Error playing audio:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
        setCurrentTime(time);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-labelledby="review-modal-title"
        >
            <div 
                className="w-full max-w-screen-2xl h-[95vh] bg-slate-900 rounded-2xl shadow-xl border border-slate-700 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 id="review-modal-title" className="text-xl font-semibold text-white">
                        Review Call: <span className="text-sky-400">{item.result.callDetails.callId}</span>
                    </h3>
                    <button onClick={onClose} aria-label="Close modal">
                        <XIcon className="w-6 h-6 text-slate-400 hover:text-white"/>
                    </button>
                </div>
                <div className="flex-grow flex overflow-hidden">
                    {/* Left Pane: Transcript */}
                    <div ref={transcriptContainerRef} className="w-1/3 p-6 overflow-y-auto border-r border-slate-700">
                        <div className="sticky top-0 bg-slate-900 pt-1 pb-4 -mt-1 z-10">
                            <h4 className="text-lg font-semibold text-white mb-2">Call Recording</h4>
                            {item.audioUrl ? (
                                <div className="p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <button onClick={togglePlayPause} className="p-2 rounded-full text-white bg-sky-600 hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400">
                                            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                                        </button>
                                        <div className="font-mono text-sm text-slate-300">
                                            {formatTime(currentTime)}
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 0}
                                            step="0.1"
                                            value={currentTime}
                                            onChange={handleSeek}
                                            className="w-full custom-range"
                                        />
                                        <div className="font-mono text-sm text-slate-300">
                                            {formatTime(duration)}
                                        </div>
                                    </div>
                                    <audio
                                        ref={audioRef}
                                        src={item.audioUrl}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        onTimeUpdate={handleTimeUpdate}
                                        onEnded={handleEnded}
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        preload="metadata"
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="h-[74px] flex items-center justify-center bg-slate-800 rounded-lg">
                                    <p className="text-lg font-semibold text-slate-500">
                                        Call Recording Unavailable
                                    </p>
                                </div>
                            )}
                            <h4 className="text-lg font-semibold text-white mt-4">Call Transcript</h4>
                        </div>
                        <TranscriptDisplay transcriptContent={item.transcriptContent} />
                    </div>
                    {/* Right Pane: Analysis */}
                    <div ref={analysisContainerRef} className="w-2/3 overflow-y-auto p-6">
                        <AnalysisCard
                            result={item.result}
                            fileName={item.fileName}
                            contentHash={item.contentHash}
                            note={note}
                            onNoteChange={onNoteChange}
                            troubleshootingFeedback={troubleshootingFeedback}
                            onTroubleshootingFeedbackChange={(stepIndex, status) => onTroubleshootingFeedbackChange(item.contentHash, stepIndex, status)}
                            campaign={campaign}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};