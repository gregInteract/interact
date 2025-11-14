import React, { useState, useCallback, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisResult, CorePillars, CallDetails, OverallFindings, AgentPerformance, TroubleshootingFeedback, TroubleshootingStatus } from '../types';
import { formatAnalysisAsText, calculateQaScores, safeFormatDate } from '../utils/exportUtils';
import { ShareIcon } from './icons/ShareIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { TagIcon } from './icons/TagIcon';
import { BillingIcon } from './icons/BillingIcon';
import { TechSupportIcon } from './icons/TechSupportIcon';
import { AccountIcon } from './icons/AccountIcon';
import { ComplaintIcon } from './icons/ComplaintIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { OwnershipIcon } from './icons/OwnershipIcon';
import { EmpathyIcon } from './icons/EmpathyIcon';
import { CopyToClipboardButton } from './CopyToClipboardButton';
import { NotApplicableIcon } from './icons/NotApplicableIcon';
import { HappyFaceIcon } from './icons/HappyFaceIcon';
import { SadFaceIcon } from './icons/SadFaceIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface AnalysisCardProps {
  fileName: string;
  result: AnalysisResult;
  contentHash: string;
  note: string;
  onNoteChange: (contentHash: string, newNote: string) => void;
  troubleshootingFeedback: TroubleshootingFeedback;
  onTroubleshootingFeedbackChange: (stepIndex: number, status: TroubleshootingStatus) => void;
  highlightedSectionId?: string | null;
  readOnly?: boolean;
  isCompact?: boolean;
  campaign?: string;
}

const InfoPill: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-center ${className}`}>
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-bold text-slate-900 dark:text-white break-all">{value}</span>
  </div>
);

const getScoreColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-500 dark:text-green-400';
    if (percentage >= 70) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
};

const CorePillarsDisplay: React.FC<{ pillars: CorePillars; campaign?: string; }> = ({ pillars, campaign }) => {
    if (campaign === 'banking') {
        const { accountVerification, empathy } = pillars;
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Verification */}
                {accountVerification && (
                    <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                         <div>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <ShieldCheckIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>
                                    <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400">Account Verification</h4>
                                </div>
                                <span className={`text-3xl font-bold ${getScoreColor(accountVerification.verificationScore)}`}>{accountVerification.verificationScore}%</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{accountVerification.verificationDetails}</p>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
                            <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Verification Breakdown:</p>
                            <ul className="list-disc list-inside space-y-1 text-base text-slate-700 dark:text-slate-300">
                               <li>Client Name Verified: {accountVerification.clientNameVerified ? <span className="font-semibold text-green-500">Yes</span> : <span className="font-semibold text-red-500">No</span>}</li>
                               <li>Static Questions: {accountVerification.staticQuestionsAsked}</li>
                               <li>Non-Static Questions: {accountVerification.nonStaticQuestionsAsked}</li>
                            </ul>
                        </div>
                    </div>
                )}
                 {/* Empathy */}
                <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                     <div>
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <EmpathyIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>
                                <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400">Empathy</h4>
                            </div>
                            <span className={`text-3xl font-bold ${getScoreColor(empathy.empathyScore)}`}>{empathy.empathyScore}%</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{empathy.sentimentAlignment}</p>
                     </div>
                     {empathy.suggestedPhrases.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
                            <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Improvement Suggestion:</p>
                            <ul className="list-disc list-inside space-y-1 text-base text-slate-700 dark:text-slate-300">
                               {empathy.suggestedPhrases.map((item, i) => <li key={i} className="italic">"{item}"</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Default: Internet & Cable
    const { procedureFlow, ownership, empathy } = pillars;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Procedure Flow */}
            {procedureFlow && (
            <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                 <div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <BookOpenIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>
                            <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400">Procedure Flow</h4>
                        </div>
                        <span className={`text-3xl font-bold ${getScoreColor(procedureFlow.adherenceScore)}`}>{procedureFlow.adherenceScore}%</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{procedureFlow.efficiencyGains}</p>
                </div>
                {procedureFlow.deviations.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
                        <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Deviations:</p>
                        <ul className="list-disc list-inside space-y-1 text-base text-slate-700 dark:text-slate-300">
                           {procedureFlow.deviations.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                )}
            </div>
            )}
            {/* Ownership */}
            {ownership && (
            <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <OwnershipIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>
                            <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400">Ownership</h4>
                        </div>
                        <span className={`text-3xl font-bold ${getScoreColor(ownership.ownershipScore)}`}>{ownership.ownershipScore}%</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{ownership.missedOpportunities || "No missed opportunities."}</p>
                </div>
                 {ownership.suggestedPhrases.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
                        <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Improvement Suggestion:</p>
                        <ul className="list-disc list-inside space-y-1 text-base text-slate-700 dark:text-slate-300">
                           {ownership.suggestedPhrases.map((item, i) => <li key={i} className="italic">"{item}"</li>)}
                        </ul>
                    </div>
                )}
            </div>
            )}
            {/* Empathy */}
            <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                 <div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <EmpathyIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>
                            <h4 className="text-lg font-semibold text-sky-600 dark:text-sky-400">Empathy</h4>
                        </div>
                        <span className={`text-3xl font-bold ${getScoreColor(empathy.empathyScore)}`}>{empathy.empathyScore}%</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{empathy.sentimentAlignment}</p>
                 </div>
                 {empathy.suggestedPhrases.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
                        <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Improvement Suggestion:</p>
                        <ul className="list-disc list-inside space-y-1 text-base text-slate-700 dark:text-slate-300">
                           {empathy.suggestedPhrases.map((item, i) => <li key={i} className="italic">"{item}"</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


const SectionCard: React.FC<{ title: string; icon: React.ReactNode; id: string; children: React.ReactNode; copyContent?: string }> = ({ title, icon, id, children, copyContent }) => (
    <div id={id} className="bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-sky-100 dark:bg-sky-900/50 p-2 rounded-full">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            </div>
            {copyContent && (
                 <CopyToClipboardButton 
                    textToCopy={copyContent} 
                    ariaLabel={`Copy ${title} section`}
                    className="-mt-2 -mr-2"
                 />
            )}
        </div>
        {children}
    </div>
);

const getStatusText = (status: TroubleshootingStatus | undefined) => {
    switch (status) {
        case 'checked': return '[Necessary]';
        case 'crossed': return '[Unnecessary]';
        case 'na': return '[N/A]';
        default: return '[Not Reviewed]';
    }
};

const getCallTypeIcon = (callType: string) => {
    const lowerCaseType = callType.toLowerCase();
    if (lowerCaseType.includes('bill') || lowerCaseType.includes('adjustments')) {
        return <BillingIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />;
    }
    if (lowerCaseType.includes('internet') || lowerCaseType.includes('cable') || lowerCaseType.includes('tivo') || lowerCaseType.includes('technician') || lowerCaseType.includes('equipment')) {
        return <TechSupportIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />;
    }
    if (lowerCaseType.includes('account') || lowerCaseType.includes('maestro') || lowerCaseType.includes('card') || lowerCaseType.includes('fraud')) {
        return <AccountIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />;
    }
    return <TagIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />;
};


export const AnalysisCard: React.FC<AnalysisCardProps> = ({ fileName, result, contentHash, note, onNoteChange, troubleshootingFeedback, onTroubleshootingFeedbackChange, highlightedSectionId, readOnly = false, isCompact = false, campaign }) => {
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const textToCopy = useMemo(() => formatAnalysisAsText(fileName, result, note, troubleshootingFeedback, campaign), [fileName, result, note, troubleshootingFeedback, campaign]);

  const qaScores = useMemo(() => calculateQaScores(result), [result]);
  
  const displayReasonDetail = useMemo(() => {
    let reason = result.resolution.reasonDetail;
    const resolvedPrefix = /^(resolved|issue resolved)[\s:]*(by|because)?\s*/i;
    const unresolvedPrefix = /^(not resolved|unresolved)[\s:]*(because|due to)?\s*/i;

    if (result.resolution.issueResolved) {
        reason = reason.replace(resolvedPrefix, '');
    } else {
        reason = reason.replace(unresolvedPrefix, '');
    }
    
    if (reason.length > 0) {
       reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    }
    return reason;
  }, [result.resolution.issueResolved, result.resolution.reasonDetail]);

  const formatRootCauseForCopy = useMemo(() => {
    if (campaign === 'banking') {
        const securityStepsFormatted = result.securityVerificationAsked && result.securityVerificationAsked.length > 0
            ? result.securityVerificationAsked.map((step, i) => `${i + 1}. ${step}`).join('\n')
            : 'None';
        return `Root Cause: ${result.rootCause}\n\nSecurity Verification Asked:\n${securityStepsFormatted}`;
    }

    const troubleshootingStepsFormatted = result.troubleshootingFlow && result.troubleshootingFlow.length > 0
      ? result.troubleshootingFlow.map((step, i) => `${i + 1}. ${step} ${getStatusText(troubleshootingFeedback?.[i])}`).join('\n')
      : 'None';
      
    return `Root Cause: ${result.rootCause}\n\nTroubleshooting Steps:\n${troubleshootingStepsFormatted}`;
  }, [result.rootCause, result.troubleshootingFlow, result.securityVerificationAsked, troubleshootingFeedback, campaign]);

  const handleNoteSave = () => {
    onNoteChange(contentHash, currentNote);
    setIsNoteEditing(false);
  };
  
  const handleExportPdf = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { 
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff' 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Analysis_${result.callDetails.callId}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [result.callDetails.callId]);
  
  const getTroubleshootingStatusIcon = (status: TroubleshootingStatus | undefined) => {
    switch (status) {
        case 'checked': return <span title="Necessary step, followed"><CheckIcon className="w-5 h-5 text-green-500"/></span>;
        case 'crossed': return <span title="Unnecessary step, followed"><XIcon className="w-5 h-5 text-red-500"/></span>;
        case 'na': return <span title="Not applicable to this scenario"><NotApplicableIcon className="w-5 h-5 text-slate-500"/></span>;
        default: return <div className="w-5 h-5" />;
    }
  };

  const getStatusButtonClass = (baseStatus: TroubleshootingStatus, currentStatus?: TroubleshootingStatus) =>
    `p-1 rounded-full transition-colors ${
        currentStatus === baseStatus 
            ? 'bg-sky-200 dark:bg-sky-800' 
            : 'hover:bg-slate-200 dark:hover:bg-slate-700'
    }`;
    
  if (isCompact) {
    // A more condensed view for the feed
    return (
        <div ref={cardRef} className="max-w-4xl mx-auto bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-sky-600 dark:text-sky-400">{result.callDetails.agentName}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{fileName}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-slate-800 dark:text-white">{result.callDetails.callId}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{safeFormatDate(result.callDetails.callDateTime)}</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div ref={cardRef} className={`max-w-4xl mx-auto space-y-8 p-4 md:p-8 rounded-2xl animate-fade-in-up ${isCompact ? '' : 'bg-transparent'}`}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
              <div className="flex items-center gap-3">
                  {getCallTypeIcon(result.callType)}
                  <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{result.callType}</h2>
                      <p className="text-slate-500 dark:text-slate-400">{fileName}</p>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                title="Export as PDF"
            >
                {isExporting ? <SpinnerIcon className="w-5 h-5" /> : <ShareIcon className="w-5 h-5" />}
            </button>
            <CopyToClipboardButton textToCopy={textToCopy} ariaLabel="Copy full analysis as text" />
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoPill label="Agent Name" value={result.callDetails.agentName} />
        <InfoPill label="Call ID" value={result.callDetails.callId} />
        <InfoPill label="Call Date" value={safeFormatDate(result.callDetails.callDateTime)} />
        <InfoPill label="Call Duration" value={result.callDetails.callDuration} />
      </div>

      {/* Summary */}
      <SectionCard title="Call Summary" icon={<BookOpenIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>} id="summary" copyContent={result.summary}>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">{result.summary}</p>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            <span className={`font-semibold ${result.resolution.issueResolved ? 'text-green-500 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400'}`}>
                {result.resolution.issueResolved ? 'Resolved' : 'Unresolved'}
            </span>
            <span className="font-normal">: {displayReasonDetail}</span>
        </p>
      </SectionCard>
      
      {/* Red Flags */}
      {result.agentBehaviorComplaint.detected && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30 flex items-start gap-3">
              <ComplaintIcon className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-300">Customer Complaint about Agent Behavior Detected</h4>
                  {result.agentBehaviorComplaint.customerComplaintQuote &&
                      <blockquote className="mt-1 text-sm italic text-red-600/80 dark:text-red-400/80 border-l-2 border-red-500/50 pl-2">
                          "{result.agentBehaviorComplaint.customerComplaintQuote}"
                      </blockquote>
                  }
              </div>
          </div>
      )}
      
      {/* Core Pillars */}
      <div id="core-pillars">
         <CorePillarsDisplay pillars={result.agentPerformance.corePillars} campaign={campaign} />
      </div>

      {/* Root Cause & Troubleshooting / Security */}
      <SectionCard 
        title={campaign === 'banking' ? "Root Cause & Security Verification" : "Root Cause & Troubleshooting"}
        icon={<TechSupportIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>} 
        id="root-cause"
        copyContent={formatRootCauseForCopy}
      >
        <p className="text-base text-slate-600 dark:text-slate-300">
          {result.rootCause}
        </p>

        {campaign === 'internet_cable' && result.troubleshootingFlow && result.troubleshootingFlow.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Troubleshooting Steps:
            </h4>
            <ul className="space-y-2">
              {result.troubleshootingFlow.map((step, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <span className="mt-1 text-slate-500 dark:text-slate-400">{index + 1}.</span>
                  <p className="flex-1 text-base text-slate-700 dark:text-slate-300">{step}</p>
                  {!readOnly && (
                    <div className={`flex items-center gap-1 transition-opacity ${troubleshootingFeedback[index] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button onClick={() => onTroubleshootingFeedbackChange(index, 'checked')} className={getStatusButtonClass('checked', troubleshootingFeedback[index])} title="Necessary step, followed">
                          <CheckIcon className="w-5 h-5 text-green-500"/>
                      </button>
                      <button onClick={() => onTroubleshootingFeedbackChange(index, 'crossed')} className={getStatusButtonClass('crossed', troubleshootingFeedback[index])} title="Unnecessary step, followed">
                          <XIcon className="w-5 h-5 text-red-500"/>
                      </button>
                      <button onClick={() => onTroubleshootingFeedbackChange(index, 'na')} className={getStatusButtonClass('na', troubleshootingFeedback[index])} title="Not applicable to this scenario">
                          <NotApplicableIcon className="w-5 h-5 text-slate-500"/>
                      </button>
                    </div>
                  )}
                  {readOnly && (
                    <div className="w-5 h-5">{getTroubleshootingStatusIcon(troubleshootingFeedback[index])}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {campaign === 'banking' && result.securityVerificationAsked && result.securityVerificationAsked.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Security Verification Asked:
            </h4>
            <ul className="space-y-2">
              {result.securityVerificationAsked.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-1 text-slate-500 dark:text-slate-400">{index + 1}.</span>
                  <p className="flex-1 text-base text-slate-700 dark:text-slate-300">{step}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>


      {/* Overall Findings */}
      <SectionCard 
        title="Overall Findings" 
        icon={<EmpathyIcon className="w-8 h-8 text-slate-500 dark:text-slate-400"/>} 
        id="overall-findings"
        copyContent={`Opportunities: ${result.overallFindings.opportunities}\nRecommendations: ${result.overallFindings.recommendations}`}
      >
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Opportunities</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">{result.overallFindings.opportunities}</p>
            </div>
            <div>
                <h4 className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Recommendations</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">{result.overallFindings.recommendations}</p>
            </div>
        </div>
      </SectionCard>
      
      {/* Notes */}
       {!readOnly && (
        <div id="notes" className="bg-white dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Notes & Comments</h3>
            {isNoteEditing ? (
                <div>
                    <textarea
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        className="w-full h-32 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Add your notes here..."
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => { setIsNoteEditing(false); setCurrentNote(note); }} className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-sm font-semibold rounded-md">Cancel</button>
                        <button onClick={handleNoteSave} className="px-3 py-1 bg-sky-600 text-white text-sm font-semibold rounded-md">Save</button>
                    </div>
                </div>
            ) : (
                <div onClick={() => setIsNoteEditing(true)} className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-md min-h-[80px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50">
                    <p className="text-base text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {note || <span className="text-slate-400 dark:text-slate-500">Click to add a note...</span>}
                    </p>
                </div>
            )}
        </div>
       )}
    </div>
  );
};
