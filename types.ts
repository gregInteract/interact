export interface ProcedureFlowAdherence {
  adherenceScore: number;
  keySteps: {
    stepName: string;
    completed: boolean;
    details: string;
  }[];
  deviations: string[];
  efficiencyGains: string;
}

export interface Ownership {
  ownershipScore: number;
  suggestedPhrases: string[];
  missedOpportunities: string;
}

export interface Empathy {
  empathyScore: number;
  suggestedPhrases: string[];
  sentimentAlignment: string;
}

export interface AccountVerification {
  clientNameVerified: boolean;
  verificationScore: number;
  staticQuestionsAsked: number;
  nonStaticQuestionsAsked: number;
  passedVerification: boolean;
  verificationDetails: string;
}

export interface CorePillars {
    procedureFlow?: ProcedureFlowAdherence;
    ownership?: Ownership;
    empathy: Empathy;
    accountVerification?: AccountVerification;
}

export interface AgentPerformance {
  corePillars: CorePillars;
}

export interface Resolution {
  issueResolved: boolean;
  resolutionLanguage: string | null;
  reasonCategory: string;
  reasonDetail: string;
}

export interface UnderstandabilityIssue {
  detected: boolean;
  samplePhrase: string | null;
}

export interface UnderstandabilityIssues {
  notUnderstandingInfo: UnderstandabilityIssue;
  audioVolume: UnderstandabilityIssue;
  clarityOfSpeech: UnderstandabilityIssue;
}

export interface OverallFindings {
  opportunities: string;
  recommendations: string;
}

export interface CallDetails {
  agentName: string;
  callId: string;
  callDuration: string; // e.g., "05:32"
  callDateTime: string; // e.g., "2023-10-27T10:00:00Z"
}

export interface AgentBehaviorComplaint {
  detected: boolean;
  customerComplaintQuote: string | null;
}

export interface AgentCommendation {
  detected: boolean;
  customerPraiseQuote: string | null;
}

export interface AnalysisResult {
  callDetails: CallDetails;
  summary: string;
  callType: string;
  rootCause: string;
  customerSentiment: {
    positivePercentage: number;
    negativePercentage: number;
    positiveCount: number;
    negativeCount: number;
  };
  holdOrSilenceCount: number;
  agentPerformance: AgentPerformance;
  resolution: Resolution;
  understandabilityIssues: UnderstandabilityIssues;
  troubleshootingFlow?: string[];
  securityVerificationAsked?: string[];
  overallFindings: OverallFindings;
  agentBehaviorComplaint: AgentBehaviorComplaint;
  agentCommendation: AgentCommendation;
  isRepeatCall?: boolean;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface ResultItem {
  fileName: string;
  result: AnalysisResult;
  contentHash: string;
  transcriptContent: string;
  audioUrl?: string;
  timestamps?: WordTimestamp[];
}

export type Campaign = 'internet_cable' | 'banking';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // In a real application, this should be a securely stored hash.
  accessLevel: 'Admin' | 'Manager' | 'Agent' | 'Team Lead';
  status: 'active' | 'deactivated';
  lastLogin?: string; // ISO string
  loginCount?: number;
  campaigns?: Campaign[];
}

export interface LoginRecord {
  userId: string;
  email: string; // Store email for easier display in summary
  timestamp: string; // ISO string
}

export interface UserSession {
  sessionId: string;
  userId: string;
  loginTimestamp: string; // ISO string
  logoutTimestamp?: string; // ISO string
  durationSeconds?: number;
}


export interface AgentPerformanceSummary {
  name: string;
  avgQaScore: number;
  callCount: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  resolutionRate: number;
  avgQaScore: number;
  avgProcedureFlowScore: number;
  avgOwnershipScore: number;
  avgEmpathyScore: number;
  avgVerificationScore: number;
  topCallDriver: { label: string; value: number } | null;
  agentPerformance: AgentPerformanceSummary[];
  topUnresolvedRootCause?: string | null;
  unresolvedReasonCounts?: { reason: string; count: number }[];
  topDissatisfactionReason?: string | null;
  dissatisfactionReasonCounts?: { reason: string; count: number }[];
}

export interface RedFlag {
    callId: string;
    agentName: string;
    reason: string;
    quote?: string | null;
}

export interface Commendation {
    callId: string;
    agentName: string;
    quote: string | null;
}

export type TroubleshootingStatus = 'checked' | 'crossed' | 'na';

export interface TroubleshootingFeedback {
  [stepIndex: number]: TroubleshootingStatus | undefined;
}

export interface AllTroubleshootingFeedback {
  [contentHash: string]: TroubleshootingFeedback;
}
