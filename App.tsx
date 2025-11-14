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
import { TranscriptAnalyzer } from './pages/TranscriptAnalyzer';

type View = 'feed' | 'dashboard' | 'searchreview' | 'admin' | 'guide' | 'analyzer';

// ... include your idle timer, utility functions, MainApplicationProps, and other helpers here (no changes needed)

// --- MainApplication Component ---
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
  const [keyHighlights, setKeyHighlights] = useState<{emoji: string, text: string}[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isD]()
