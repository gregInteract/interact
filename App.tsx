

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisCard } from './components/AnalysisCard';
import { Loader } from './components/Loader';
import { analyzeTranscript, generateHighlights, generateTranscriptTimestamps, maskPiiInTranscript } from './services/geminiService';
import type { AnalysisResult, ResultItem, User, UserSession, WordTimestamp, AllTroubleshootingFeedback, TroubleshootingStatus } from './types';
import { Logo } from './components/Logo';
import { SearchIcon } from './components/icons/SearchIcon';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { FeedIcon } from './components/icons/FeedIcon';
import { DashboardIcon } from './components/icons/DashboardIcon';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { LogoutIcon } from './components/icons/LogoutIcon';
import { SearchAndReview } from './components/QuickSearch';
import { QuickSearchIcon } from './components/icons/QuickSearchIcon';
import { generateDashboardMetrics, splitTranscript } from './utils/exportUtils';
import { GearIcon } from './components/icons/GearIcon';
import { UserGuide } from './components/UserGuide';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { CampaignSelection } from './components/CampaignSelection';
import { Notification } from './components/Notification';

type View = 'feed' | 'dashboard' | 'searchreview' | 'admin' | 'guide';

const useIdleTimer = (onIdle: () => void, idleTimeInMs: number) => {
    const timeoutId = useRef<number | null>(null);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            window.clearTimeout(timeoutId.current);
        }
        timeoutId.current = window.setTimeout(onIdle, idleTimeInMs);
    }, [onIdle, idleTimeInMs]);

    useEffect(() => {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        
        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer(); // Start the timer on mount

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutId.current) {
                window.clearTimeout(timeoutId.current);
            }
        };
    }, [resetTimer]);
};

// Standalone utility functions moved from MainApplication to persist across component lifecycles
const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.addEventListener('error', (e) => {
            reject(new Error("Could not load audio metadata."));
        });
    });
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const generateContentHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface MainApplicationProps {
    user: User;
    onLogout: () => void;
    campaign: string;
    onSwitchCampaign: () => void;
    availableCampaigns: string[];
    onFileUpload: (files: FileList) => void;
    isLoading: boolean;
    onCancelUpload: () => void;
    uploadError: string | null;
    notification: string | null;
    setNotification: (message: string | null) => void;
    refreshKey: number;
}

const MainApplication: React.FC<MainApplicationProps> = ({ 
    user, 
    onLogout, 
    campaign, 
    onSwitchCampaign, 
    availableCampaigns,
    onFileUpload,
    isLoading,
    onCancelUpload,
    uploadError,
    notification,
    setNotification,
    refreshKey
}) => {
  const [analysisResults, setAnalysisResults] = useState<ResultItem[]>([]);
  const [historicalData, setHistoricalData] = useState<ResultItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [troubleshootingFeedback, setTroubleshootingFeedback] = useState<AllTroubleshootingFeedback>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<View>(user.accessLevel === 'Agent' ? 'guide' : 'dashboard');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [reviewedCalls, setReviewedCalls] = useState<Record<string, string>>({});
  const analysisCache = useRef(new Map<string, AnalysisResult>());
  const timestampsCache = useRef(new Map<string, WordTimestamp[]>());

  // State for Key Highlights, managed here to prevent re-fetching on tab switch
  const [keyHighlights, setKeyHighlights] = useState<{emoji: string, text: string}[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string|null>(null);

  // Pagination state for Data Feed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Set up idle timer
  useIdleTimer(onLogout, 20 * 60 * 1000); // 20 minutes
  
  const getCampaignScopedKey = useCallback((key: string) => `${campaign}_${key}`, [campaign]);

  // Load notes, cache, and historical data from localStorage on initial mount or when campaign/refreshKey changes
  useEffect(() => {
    // Reset state when campaign changes to prevent data leak between campaigns
    setAnalysisResults([]);
    setHistoricalData([]);
    setNotes({});
    setTroubleshootingFeedback({});
    setReviewedCalls({});
    setKeyHighlights([]);
    analysisCache.current = new Map();
    timestampsCache.current = new Map();
    setIsDataLoaded(false);

    try {
      const savedNotes = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_notes'));
      if (savedNotes) setNotes(JSON.parse(savedNotes));

      const savedFeedback = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_troubleshooting_feedback'));
      if (savedFeedback) setTroubleshootingFeedback(JSON.parse(savedFeedback));

      const savedCache = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_cache'));
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        if (Array.isArray(parsedCache)) {
          analysisCache.current = new Map<string, AnalysisResult>(parsedCache);
        }
      }
      
      const savedTimestamps = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_timestamps_cache'));
      if (savedTimestamps) {
          timestampsCache.current = new Map(JSON.parse(savedTimestamps));
      }

      const savedHistoricalData = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_historical_data'));
      if (savedHistoricalData) {
          const parsedData: ResultItem[] = JSON.parse(savedHistoricalData);
          setHistoricalData(parsedData);
          // Initialize analysis results with historical data, sorted newest first
          const sortedData = [...parsedData].sort((a, b) => 
              new Date(b.result.callDetails.callDateTime).getTime() - new Date(a.result.callDetails.callDateTime).getTime()
          );
          setAnalysisResults(sortedData);
      }
      
      // Global (non-campaign-scoped) data
      const savedUsers = localStorage.getItem('transcript_analyzer_users');
      if (savedUsers) {
          const parsedUsers: User[] = JSON.parse(savedUsers);
          const migratedUsers = parsedUsers.map(u => ({ ...u, status: u.status || 'active' }));
          setAllUsers(migratedUsers);
      }
      
      const savedReviewedCalls = localStorage.getItem(getCampaignScopedKey('transcript_analyzer_global_reviewed_calls'));
      if (savedReviewedCalls) setReviewedCalls(JSON.parse(savedReviewedCalls));

    } catch (err)      {
      console.error("Failed to load data from localStorage:", err);
    } finally {
        setIsDataLoaded(true);
    }
  }, [getCampaignScopedKey, refreshKey]);

  // Effect to handle view redirection based on role
  useEffect(() => {
    const userRole = user.accessLevel;

    if (userRole === 'Agent' && view !== 'guide') setView('guide');
    if (userRole === 'Team Lead' && (view === 'admin' || view === 'feed')) setView('dashboard');
    if (userRole === 'Manager' && view === 'admin') setView('dashboard');

  }, [view, user.accessLevel]);
  

  const fullDatasetMetrics = useMemo(() => generateDashboardMetrics(historicalData.map(d => d.result)), [historicalData]);
  
  useEffect(() => {
    if (!isDataLoaded) return;

    const LS_HIGHLIGHTS_KEY = getCampaignScopedKey('transcript_analyzer_key_highlights');
    const LS_HIGHLIGHTS_COUNT_KEY = getCampaignScopedKey('transcript_analyzer_highlights_data_count');
    
    const summary = fullDatasetMetrics.analyticsSummary;

    if (!summary || summary.totalCalls === 0) {
      setKeyHighlights([]);
      localStorage.removeItem(LS_HIGHLIGHTS_KEY);
      localStorage.removeItem(LS_HIGHLIGHTS_COUNT_KEY);
      return;
    }

    const fetchOrLoadHighlights = async () => {
      const savedHighlightsJSON = localStorage.getItem(LS_HIGHLIGHTS_KEY);
      const savedDataCount = localStorage.getItem(LS_HIGHLIGHTS_COUNT_KEY);
      const currentDataCount = historicalData.length.toString();

      if (savedHighlightsJSON && savedDataCount === currentDataCount) {
        try {
          setKeyHighlights(JSON.parse(savedHighlightsJSON));
          return;
        } catch (err) {
          console.error("Failed to parse saved highlights, will regenerate:", err);
        }
      }

      setHighlightsLoading(true);
      setHighlightsError(null);
      try {
        const result = await generateHighlights(summary, campaign);
        setKeyHighlights(result);
        localStorage.setItem(LS_HIGHLIGHTS_KEY, JSON.stringify(result));
        localStorage.setItem(LS_HIGHLIGHTS_COUNT_KEY, currentDataCount);
      } catch (err) {
        setHighlightsError("Could not generate AI highlights. This may be due to API restrictions or an error.");
        console.error(err);
      } finally {
        setHighlightsLoading(false);
      }
    };

    fetchOrLoadHighlights();
  }, [fullDatasetMetrics, historicalData, isDataLoaded, getCampaignScopedKey, campaign]);
  
  const handleNoteChange = useCallback((contentHash: string, newNote: string) => {
    setNotes(prevNotes => {
      const updatedNotes = { ...prevNotes, [contentHash]: newNote };
      try {
        localStorage.setItem(getCampaignScopedKey('transcript_analyzer_notes'), JSON.stringify(updatedNotes));
      } catch (err) {
        console.error("Failed to save notes to localStorage:", err);
      }
      return updatedNotes;
    });
  }, [getCampaignScopedKey]);

  const handleTroubleshootingFeedbackChange = useCallback((contentHash: string, stepIndex: number, status: TroubleshootingStatus) => {
    setTroubleshootingFeedback(prev => {
        const currentFeedback = prev[contentHash]?.[stepIndex];
        const newStatus = currentFeedback === status ? undefined : status;
        const updatedFeedbackForCall = { ...(prev[contentHash] || {}), [stepIndex]: newStatus };
        const updated = { ...prev, [contentHash]: updatedFeedbackForCall };
        try {
            localStorage.setItem(getCampaignScopedKey('transcript_analyzer_troubleshooting_feedback'), JSON.stringify(updated));
        } catch (err) {
            console.error("Failed to save troubleshooting feedback to localStorage:", err);
        }
        return updated;
    });
  }, [getCampaignScopedKey]);

  const handleToggleReviewed = useCallback((contentHash: string) => {
    if (!user) return;
    setReviewedCalls(prev => {
        const reviewerId = prev[contentHash];
        const updated = { ...prev };
        if (reviewerId && reviewerId === user.id) {
            delete updated[contentHash];
        } else if (!reviewerId) {
            updated[contentHash] = user.id;
        } else {
            return prev;
        }
        try {
            localStorage.setItem(getCampaignScopedKey('transcript_analyzer_global_reviewed_calls'), JSON.stringify(updated));
        } catch (err) {
            console.error("Failed to save reviewed calls to localStorage:", err);
        }
        return updated;
    });
  }, [user, getCampaignScopedKey]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return analysisResults;
    const lowercasedQuery = searchQuery.toLowerCase();
    return analysisResults.filter(item => {
      const { fileName, result } = item;
      const { callDetails, summary, rootCause, callType } = result;
      return (
        fileName.toLowerCase().includes(lowercasedQuery) ||
        callDetails.agentName.toLowerCase().includes(lowercasedQuery) ||
        callDetails.callId.toLowerCase().includes(lowercasedQuery) ||
        summary.toLowerCase().includes(lowercasedQuery) ||
        rootCause.toLowerCase().includes(lowercasedQuery) ||
        callType.toLowerCase().includes(lowercasedQuery)
      );
    });
  }, [analysisResults, searchQuery]);
  
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalPages = useMemo(() => Math.ceil(filteredResults.length / itemsPerPage), [filteredResults.length]);

  const paginatedResults = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage]);


  const navButtonStyles = (buttonView: View) => 
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-offset-white ${
        view === buttonView 
            ? 'bg-sky-600 text-white' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/50'
    }`;
  
  const updateUsers = (updatedUsers: User[]) => {
      try {
          localStorage.setItem('transcript_analyzer_users', JSON.stringify(updatedUsers));
          setAllUsers(updatedUsers);
      } catch (err) {
          console.error("Failed to save users to localStorage:", err);
      }
  };
  

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-sans">
      {notification && (
        <div className="fixed top-5 right-5 z-50">
            <Notification message={notification} onClose={() => setNotification(null)} />
        </div>
      )}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-800 p-6 flex flex-col border-r border-slate-200 dark:border-slate-700">
          <header className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                  <Logo />
                  <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                      AdvantageCall Interact
                  </h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                  AI-powered analysis for the <span className="font-semibold text-sky-500 dark:text-sky-400">{campaign.replace('_', ' & ').replace(/\b\w/g, l => l.toUpperCase())}</span> campaign.
              </p>
          </header>

          <nav className="flex-grow flex flex-col space-y-2">
            {['Admin', 'Manager', 'Team Lead'].includes(user.accessLevel) && (
                <>
                  <button onClick={() => setView('dashboard')} className={navButtonStyles('dashboard')}>
                      <DashboardIcon className="w-6 h-6" />
                      <span>Dashboard</span>
                  </button>
                  <button onClick={() => setView('searchreview')} className={navButtonStyles('searchreview')}>
                      <QuickSearchIcon className="w-6 h-6" />
                      <span>Search &amp; Review</span>
                  </button>
                </>
            )}

              {['Admin', 'Manager'].includes(user.accessLevel) && (
                 <button onClick={() => setView('feed')} className={navButtonStyles('feed')}>
                    <FeedIcon className="w-6 h-6" />
                    <span>Data Feed</span>
                 </button>
              )}

              {user.accessLevel === 'Admin' && (
                <button onClick={() => setView('admin')} className={navButtonStyles('admin')}>
                    <GearIcon className="w-6 h-6" />
                    <span>Admin</span>
                </button>
              )}
                <button onClick={() => setView('guide')} className={navButtonStyles('guide')}>
                    <BookOpenIcon className="w-6 h-6" />
                    <span>User Guide</span>
                </button>
          </nav>

          <div className="mt-auto">
            {availableCampaigns.length > 1 && (
                <button
                  onClick={onSwitchCampaign}
                  className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg font-semibold text-left text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span>Switch Campaign</span>
                </button>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-left text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-600 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
            >
              <LogoutIcon className="w-6 h-6" />
              <span>Logout</span>
            </button>
          </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex justify-end items-center p-4 md:px-12 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 text-sm">
            <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-800 flex items-center justify-center font-bold text-sky-700 dark:text-sky-300">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div>
                <p className="font-semibold text-slate-800 dark:text-white">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.accessLevel}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-50 dark:bg-slate-900">
            {!isLoading && uploadError && (
                <div className="text-center my-6 p-4 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/30 rounded-lg max-w-4xl mx-auto">
                    <p className="text-red-600 dark:text-red-400 font-semibold">An Error Occurred</p>
                    <p className="text-red-500 dark:text-red-300 mt-1">{uploadError}</p>
                </div>
            )}

            {view === 'feed' && (
              <>
                <div className="max-w-3xl mx-auto mb-12">
                   <div className="flex items-center gap-4 mb-4">
                       <UploadIcon className="w-10 h-10 text-sky-400" />
                       <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Upload Transcripts</h2>
                   </div>
                  <FileUpload onFileUpload={onFileUpload} disabled={isLoading} />
                </div>

                {analysisResults.length > 0 && (
                  <div className="mb-8 max-w-4xl mx-auto">
                    <div className="relative w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search by keyword, agent, call ID, filename..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        aria-label="Search transcripts"
                      />
                    </div>
                  </div>
                )}

                {isLoading && <Loader onCancel={onCancelUpload} />}

                <div className="space-y-8">
                  {paginatedResults.length > 0 ? (
                    paginatedResults.map((item) => (
                      <AnalysisCard 
                        key={item.contentHash} 
                        fileName={item.fileName} 
                        result={item.result}
                        contentHash={item.contentHash}
                        note={notes[item.contentHash] || ''}
                        onNoteChange={handleNoteChange}
                        troubleshootingFeedback={troubleshootingFeedback[item.contentHash] || {}}
                        onTroubleshootingFeedbackChange={(stepIndex, status) => handleTroubleshootingFeedbackChange(item.contentHash, stepIndex, status)}
                        isCompact
                        campaign={campaign}
                      />
                    ))
                  ) : (
                    !isLoading && analysisResults.length > 0 && (
                      <div className="text-center py-16">
                        <SearchIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                        <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">No Results Found</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Your search for "{searchQuery}" did not match any transcripts.</p>
                      </div>
                    )
                  )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => setCurrentPage(p => p - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900"
                            aria-label="Go to previous page"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600 dark:text-slate-400" aria-label={`Page ${currentPage} of ${totalPages}`}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900"
                            aria-label="Go to next page"
                        >
                            Next
                        </button>
                    </div>
                )}
              </>
            )}

            {view === 'dashboard' && (
                <AnalyticsDashboard
                  data={historicalData}
                  keyHighlights={keyHighlights}
                  highlightsLoading={highlightsLoading}
                  highlightsError={highlightsError}
                  notes={notes}
                  onNoteChange={handleNoteChange}
                  troubleshootingFeedback={troubleshootingFeedback}
                  onTroubleshootingFeedbackChange={handleTroubleshootingFeedbackChange}
                  campaign={campaign}
                />
            )}
            
            {view === 'searchreview' && (
                <SearchAndReview 
                  data={historicalData} 
                  allUsers={allUsers} 
                  currentUser={user} 
                  reviewedCalls={reviewedCalls}
                  onToggleReviewed={handleToggleReviewed}
                  notes={notes}
                  onNoteChange={handleNoteChange}
                  troubleshootingFeedback={troubleshootingFeedback}
                  onTroubleshootingFeedbackChange={handleTroubleshootingFeedbackChange}
                  campaign={campaign}
                />
            )}

            {view === 'admin' && (
                <Admin allUsers={allUsers} onUpdateUsers={updateUsers} />
            )}

            
            {view === 'guide' && (
                <UserGuide user={user} />
            )}
        </div>
      </main>
    </div>
  );
};

interface UploadState {
  isLoading: boolean;
  uploadError: string | null;
  controller: AbortController | null;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem('authenticatedUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from sessionStorage", error);
      sessionStorage.removeItem('authenticatedUser');
      return null;
    }
  });

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(() => {
    return sessionStorage.getItem('selectedCampaign');
  });

  const [uploadStates, setUploadStates] = useState<Record<string, Partial<UploadState>>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);


  const handleFileUpload = useCallback(async (files: FileList, campaignForUpload: string) => {
    const controller = new AbortController();
    setUploadStates(prev => ({
      ...prev,
      [campaignForUpload]: { isLoading: true, uploadError: null, controller }
    }));
    
    const { signal } = controller;
    const getCampaignScopedKeyForUpload = (key: string) => `${campaignForUpload}_${key}`;
    
    const setCampaignError = (message: string) => {
        setUploadStates(prev => ({
            ...prev,
            [campaignForUpload]: { ...prev[campaignForUpload], uploadError: message }
        }));
    };
    
    try {
        const savedHistoricalData = localStorage.getItem(getCampaignScopedKeyForUpload('transcript_analyzer_historical_data'));
        let updatedHistoricalData: ResultItem[] = savedHistoricalData ? JSON.parse(savedHistoricalData) : [];

        const savedCache = localStorage.getItem(getCampaignScopedKeyForUpload('transcript_analyzer_cache'));
        const analysisCacheForUpload = new Map<string, AnalysisResult>(savedCache ? JSON.parse(savedCache) : []);

        const savedTimestamps = localStorage.getItem(getCampaignScopedKeyForUpload('transcript_analyzer_timestamps_cache'));
        const timestampsCacheForUpload = new Map<string, WordTimestamp[]>(savedTimestamps ? JSON.parse(savedTimestamps) : []);

        const filesToProcess = Array.from(files);
        const textFiles = filesToProcess.filter(f => f.type.startsWith('text/'));
        const audioFiles = filesToProcess.filter(f => f.type.startsWith('audio/'));
        
        const getBaseName = (fileName: string) => fileName.split('.').slice(0, -1).join('.');

        let madeChanges = false;
        let lastError: string | null = null;

        for (const textFile of textFiles) {
            signal.throwIfAborted();
            try {
                const originalContent = await textFile.text();
                let finalContent = originalContent;

                if (campaignForUpload === 'banking') {
                    finalContent = await maskPiiInTranscript(originalContent);
                }

                const contentHash = await generateContentHash(finalContent);
                let result: AnalysisResult;

                if (analysisCacheForUpload.has(contentHash)) {
                    result = analysisCacheForUpload.get(contentHash)!;
                } else {
                    result = await analyzeTranscript(finalContent, campaignForUpload);
                    analysisCacheForUpload.set(contentHash, result);
                    localStorage.setItem(getCampaignScopedKeyForUpload('transcript_analyzer_cache'), JSON.stringify(Array.from(analysisCacheForUpload.entries())));
                }

                if (updatedHistoricalData.some(item => item.result.callDetails.callId === result.callDetails.callId)) {
                    console.warn(`Duplicate Call ID: Analysis for Call ID '${result.callDetails.callId}' from file '${textFile.name}' already exists.`);
                    continue;
                }
                
                const newItem: ResultItem = { 
                    fileName: textFile.name, 
                    result, 
                    contentHash, 
                    transcriptContent: finalContent,
                };
                updatedHistoricalData.push(newItem);
                madeChanges = true;
            } catch (err) {
                 if (err instanceof DOMException && err.name === 'AbortError') throw err;
                console.error(`Error processing file ${textFile.name}:`, err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                lastError = `Failed to analyze ${textFile.name}. ${errorMessage}`;
                break; 
            }
        }
        
        signal.throwIfAborted();

        if (lastError) {
            setCampaignError(lastError);
        }

        if (audioFiles.length > 0) {
            const audioMap = new Map<string, File>();
            audioFiles.forEach(file => audioMap.set(getBaseName(file.name), file));

            const updatedItemsPromises = updatedHistoricalData.map(async (item) => {
                if (item.audioUrl) return item;
                
                const matchingAudioFile = audioMap.get(getBaseName(item.fileName));
                if (matchingAudioFile) {
                    signal.throwIfAborted();
                    madeChanges = true;
                    const audioUrl = await fileToDataUrl(matchingAudioFile);
                    try {
                        const duration = await getAudioDuration(audioUrl);
                        const cacheKey = `${item.contentHash}:${duration.toFixed(2)}`;
                        let timestamps: WordTimestamp[] | undefined;

                        if (timestampsCacheForUpload.has(cacheKey)) {
                            timestamps = timestampsCacheForUpload.get(cacheKey);
                        } else {
                            const { header, dialogue } = splitTranscript(item.transcriptContent);
                            if (dialogue) {
                                signal.throwIfAborted();
                                timestamps = await generateTranscriptTimestamps(header, dialogue, duration);
                                timestampsCacheForUpload.set(cacheKey, timestamps);
                                localStorage.setItem(getCampaignScopedKeyForUpload('transcript_analyzer_timestamps_cache'), JSON.stringify(Array.from(timestampsCacheForUpload.entries())));
                            }
                        }
                        return { ...item, audioUrl, timestamps };
                    } catch (err) {
                        if (err instanceof DOMException && err.name === 'AbortError') throw err;
                        console.error(`Error processing audio for ${item.fileName}:`, err);
                        if (!lastError) {
                            const audioError = `Failed to sync audio for ${item.fileName}. Playback will be available but not synced.`;
                            setCampaignError(audioError);
                        }
                        return { ...item, audioUrl };
                    }
                }
                return item;
            });
            updatedHistoricalData = await Promise.all(updatedItemsPromises);
        }

        if (madeChanges) {
            localStorage.setItem(getCampaignScopedKeyForUpload('transcript_analyzer_historical_data'), JSON.stringify(updatedHistoricalData));
            
            // If the user is still on the same campaign, trigger a refresh.
            if (sessionStorage.getItem('selectedCampaign') === campaignForUpload) {
                setRefreshKey(k => k + 1);
            }
        }

    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            setCampaignError("Upload cancelled by user.");
        } else {
            console.error('Upload process failed:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setCampaignError(`An error occurred during upload: ${errorMessage}`);
        }
    } finally {
        setUploadStates(prev => ({
            ...prev,
            [campaignForUpload]: { ...prev[campaignForUpload], isLoading: false, controller: null }
        }));
    }
  }, []);

  const handleCancelUpload = useCallback((campaignToCancel: string) => {
    uploadStates[campaignToCancel]?.controller?.abort();
  }, [uploadStates]);

  // Effect to validate selectedCampaign when currentUser changes
  useEffect(() => {
    if (currentUser) {
        const availableCampaigns = currentUser.accessLevel === 'Admin' 
            ? ['internet_cable', 'banking'] 
            : currentUser.campaigns || [];
        
        const storedCampaign = sessionStorage.getItem('selectedCampaign');
        if (storedCampaign && !availableCampaigns.includes(storedCampaign as any)) {
            // Invalid campaign in storage for this user, clear it.
            sessionStorage.removeItem('selectedCampaign');
            setSelectedCampaign(null);
        }
    }
  }, [currentUser]);


  const handleLoginSuccess = (user: User) => {
    sessionStorage.setItem('authenticatedUser', JSON.stringify(user));
    setCurrentUser(user);
    
    const userCampaigns = user.campaigns || [];
    
    if (user.accessLevel !== 'Admin' && userCampaigns.length === 1) {
      handleCampaignSelect(userCampaigns[0]);
    }
  };

  const handleCampaignSelect = (campaign: string) => {
    sessionStorage.setItem('selectedCampaign', campaign);
    setSelectedCampaign(campaign);
  };
  
  const handleSwitchCampaign = () => {
    sessionStorage.removeItem('selectedCampaign');
    setSelectedCampaign(null);
  };

  const handleLogout = () => {
    const activeSessionId = sessionStorage.getItem('activeSessionId');
    if (activeSessionId) {
        try {
            const LS_SESSIONS_KEY = 'transcript_analyzer_sessions';
            const savedSessions = localStorage.getItem(LS_SESSIONS_KEY);
            const sessions: UserSession[] = savedSessions ? JSON.parse(savedSessions) : [];
            
            const sessionIndex = sessions.findIndex(s => s.sessionId === activeSessionId);
            if (sessionIndex > -1) {
                const session = sessions[sessionIndex];
                if (!session.logoutTimestamp) { // Only update if not already logged out
                    const logoutTimestamp = new Date();
                    session.logoutTimestamp = logoutTimestamp.toISOString();
                    session.durationSeconds = (logoutTimestamp.getTime() - new Date(session.loginTimestamp).getTime()) / 1000;
                    
                    sessions[sessionIndex] = session;
                    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
                }
            }
        } catch (error) {
            console.error("Failed to update session on logout", error);
        }
    }
    
    sessionStorage.removeItem('authenticatedUser');
    sessionStorage.removeItem('activeSessionId');
    sessionStorage.removeItem('selectedCampaign');
    setCurrentUser(null);
    setSelectedCampaign(null);
  };
  
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const availableCampaigns = currentUser.accessLevel === 'Admin'
    ? ['internet_cable', 'banking']
    : currentUser.campaigns || [];

  if (availableCampaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h2 className="text-2xl font-bold mb-4">No Campaign Access</h2>
        <p className="text-slate-400 mb-6">You have not been assigned to any campaigns. Please contact an administrator.</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }
  
  if (selectedCampaign) {
    const currentUploadState = uploadStates[selectedCampaign];
    return <MainApplication 
                user={currentUser} 
                onLogout={handleLogout} 
                campaign={selectedCampaign} 
                onSwitchCampaign={handleSwitchCampaign}
                availableCampaigns={availableCampaigns}
                onFileUpload={(files) => handleFileUpload(files, selectedCampaign)}
                isLoading={currentUploadState?.isLoading || false}
                onCancelUpload={() => handleCancelUpload(selectedCampaign)}
                uploadError={currentUploadState?.uploadError || null}
                notification={notification}
                setNotification={setNotification}
                refreshKey={refreshKey}
            />;
  }
  
  return <CampaignSelection onCampaignSelect={handleCampaignSelect} availableCampaigns={availableCampaigns} />;
}


export default App;