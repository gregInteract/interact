import type { AnalysisResult, AnalyticsSummary, AgentPerformanceSummary, ResultItem, RedFlag, Commendation, TroubleshootingFeedback, TroubleshootingStatus } from '../types';

export const safeGetTime = (dateString: string | null | undefined): number => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
};

export const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return the original invalid string, like "N/A"
    }
    return date.toLocaleString();
};

export const safeFormatDateOnly = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString();
};

export const calculateQaScores = (result: AnalysisResult) => {
  const { corePillars } = result.agentPerformance;
  const { procedureFlow, ownership, empathy, accountVerification } = corePillars;

  // Default values
  let total = { score: 0, possible: 100 };
  let pf = { score: 0, possible: 100 };
  let own = { score: 0, possible: 100 };
  let emp = { score: empathy?.empathyScore || 0, possible: 100 };

  if (procedureFlow && ownership) { // internet_cable
    const totalScore = (procedureFlow.adherenceScore + ownership.ownershipScore + empathy.empathyScore) / 3;
    total = { score: totalScore, possible: 100 };
    pf = { score: procedureFlow.adherenceScore, possible: 100 };
    own = { score: ownership.ownershipScore, possible: 100 };
  } else if (accountVerification) { // banking
    const totalScore = (accountVerification.verificationScore + empathy.empathyScore) / 2;
    total = { score: totalScore, possible: 100 };
    pf = { score: accountVerification.verificationScore, possible: 100 }; // For banking, let's map verification to 'flow' for generic use
    // own will remain 0, which is correct for banking
  }

  return {
    procedureFlow: pf,
    ownership: own,
    empathy: emp,
    total: total,
  };
};

export const parseDurationToSeconds = (durationStr: string | null): number => {
    if (!durationStr || !/^\d+:\d+$/.test(durationStr)) return 0;
    const parts = durationStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
};

export const generateDashboardMetrics = (dataToAnalyze: AnalysisResult[]) => {
    if (dataToAnalyze.length === 0) {
        const emptySummary: AnalyticsSummary = {
            totalCalls: 0,
            resolutionRate: 0,
            avgQaScore: 0,
            avgProcedureFlowScore: 0,
            avgOwnershipScore: 0,
            avgEmpathyScore: 0,
            avgVerificationScore: 0,
            topCallDriver: null,
            agentPerformance: [],
            topUnresolvedRootCause: null,
            unresolvedReasonCounts: [],
            topDissatisfactionReason: null,
            dissatisfactionReasonCounts: [],
        };
        return {
            totalCalls: 0,
            avgDuration: '00:00',
            avgQaScore: 0,
            avgProcedureFlowScore: 0,
            avgOwnershipScore: 0,
            avgEmpathyScore: 0,
            avgVerificationScore: 0,
            resolved: { count: 0 },
            unresolved: { count: 0 },
            sentiment: {
                positive: 0,
                negative: 0,
                positivePercent: 0,
                negativePercent: 0,
            },
            callTypes: [],
            analyticsSummary: emptySummary
        };
    }

    let totalQaScore = 0, totalProcedureFlowScore = 0, totalOwnershipScore = 0, totalEmpathyScore = 0, totalVerificationScore = 0;
    let resolvedCount = 0;
    let positiveMentions = 0, negativeMentions = 0;
    const callTypeCounts: Record<string, number> = {};
    let totalDurationSeconds = 0;

    dataToAnalyze.forEach(item => {
        const scores = calculateQaScores(item);
        totalQaScore += scores.total.score;
        totalProcedureFlowScore += scores.procedureFlow?.score || 0;
        totalOwnershipScore += scores.ownership?.score || 0;
        totalEmpathyScore += scores.empathy.score;
        totalVerificationScore += item.agentPerformance.corePillars.accountVerification?.verificationScore || 0;

        if (item.resolution.issueResolved) resolvedCount++;
        positiveMentions += item.customerSentiment.positiveCount;
        negativeMentions += item.customerSentiment.negativeCount;

        callTypeCounts[item.callType] = (callTypeCounts[item.callType] || 0) + 1;

        totalDurationSeconds += parseDurationToSeconds(item.callDetails.callDuration);
    });
    
    const sortedCallTypes = Object.entries(callTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => ({ label: type, value: count }));
    
    const totalCalls = dataToAnalyze.length;
    const avgDurationSeconds = totalCalls > 0 ? totalDurationSeconds / totalCalls : 0;
    const avgMinutes = Math.floor(avgDurationSeconds / 60);
    const avgSeconds = Math.round(avgDurationSeconds % 60);

    const totalMentions = positiveMentions + negativeMentions;

    const agentPerformance: AgentPerformanceSummary[] = [];
    const agentData: Record<string, { totalScore: number; count: number }> = {};

    dataToAnalyze.forEach(item => {
        const agentName = item.callDetails.agentName;
        const scores = calculateQaScores(item);
        const qaPercent = scores.total.score;
        
        if (!agentData[agentName]) {
            agentData[agentName] = { totalScore: 0, count: 0 };
        }
        agentData[agentName].totalScore += qaPercent;
        agentData[agentName].count++;
    });

    for (const name in agentData) {
        agentPerformance.push({
            name,
            avgQaScore: agentData[name].totalScore / agentData[name].count,
            callCount: agentData[name].count
        });
    }
    agentPerformance.sort((a, b) => b.avgQaScore - a.avgQaScore);

    const unresolvedRootCauses: Record<string, number> = {};
    const unresolvedReasons: Record<string, number> = {};

    dataToAnalyze.forEach(item => {
        if (!item.resolution.issueResolved) {
            const cause = item.rootCause || 'Unknown';
            unresolvedRootCauses[cause] = (unresolvedRootCauses[cause] || 0) + 1;

            if (item.resolution.reasonCategory) {
                const reason = item.resolution.reasonCategory.trim().replace(/\.$/, '');
                unresolvedReasons[reason] = (unresolvedReasons[reason] || 0) + 1;
            }
        }
    });
    
    const topUnresolvedRootCause = Object.entries(unresolvedRootCauses).sort(([,a], [,b]) => b - a)[0]?.[0];
    const sortedUnresolvedReasons = Object.entries(unresolvedReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    const analyticsSummary: AnalyticsSummary = {
        totalCalls,
        resolutionRate: totalCalls > 0 ? (resolvedCount / totalCalls) * 100 : 0,
        avgQaScore: totalCalls > 0 ? totalQaScore / totalCalls : 0,
        avgProcedureFlowScore: totalCalls > 0 ? totalProcedureFlowScore / totalCalls : 0,
        avgOwnershipScore: totalCalls > 0 ? totalOwnershipScore / totalCalls : 0,
        avgEmpathyScore: totalCalls > 0 ? totalEmpathyScore / totalCalls : 0,
        avgVerificationScore: totalCalls > 0 ? totalVerificationScore / totalCalls : 0,
        topCallDriver: sortedCallTypes.length > 0 ? sortedCallTypes[0] : null,
        agentPerformance: agentPerformance,
        topUnresolvedRootCause: topUnresolvedRootCause || null,
        unresolvedReasonCounts: sortedUnresolvedReasons,
        topDissatisfactionReason: topUnresolvedRootCause || null,
        dissatisfactionReasonCounts: sortedUnresolvedReasons,
    };

    return {
        totalCalls,
        avgDuration: `${String(avgMinutes).padStart(2, '0')}:${String(avgSeconds).padStart(2, '0')}`,
        avgQaScore: analyticsSummary.avgQaScore,
        avgProcedureFlowScore: analyticsSummary.avgProcedureFlowScore,
        avgOwnershipScore: analyticsSummary.avgOwnershipScore,
        avgEmpathyScore: analyticsSummary.avgEmpathyScore,
        avgVerificationScore: analyticsSummary.avgVerificationScore,
        resolved: { count: resolvedCount },
        unresolved: { count: totalCalls - resolvedCount },
        sentiment: {
          positive: positiveMentions,
          negative: negativeMentions,
          positivePercent: totalMentions > 0 ? Math.round((positiveMentions / totalMentions) * 100) : 0,
          negativePercent: totalMentions > 0 ? Math.round((negativeMentions / totalMentions) * 100) : 0,
        },
        callTypes: sortedCallTypes,
        analyticsSummary
    };
}

const getStatusText = (status: TroubleshootingStatus | undefined) => {
    switch (status) {
        case 'checked': return '[Necessary]';
        case 'crossed': return '[Unnecessary]';
        case 'na': return '[N/A]';
        default: return '[Not Reviewed]';
    }
};

export const formatAnalysisAsText = (
    fileName: string,
    result: AnalysisResult,
    note?: string,
    troubleshootingFeedback?: TroubleshootingFeedback,
    campaign?: string
): string => {
  const qaScores = calculateQaScores(result);
  const { procedureFlow, ownership, empathy, accountVerification } = result.agentPerformance.corePillars;

  let rootCauseAndTroubleshootingSection = '';
  let corePillarsSection = '';

  if (campaign === 'banking' && accountVerification) {
    const securityVerificationFormatted = result.securityVerificationAsked && result.securityVerificationAsked.length > 0
        ? result.securityVerificationAsked.map((step, i) => `  ${i + 1}. ${step}`).join('\n')
        : '  None';

    rootCauseAndTroubleshootingSection = `
ROOT CAUSE & SECURITY VERIFICATION
- Root Cause: ${result.rootCause}
- Security Verification Asked:
${securityVerificationFormatted}
`;

    corePillarsSection = `
CORE PILLAR PERFORMANCE (Call Quality Score: ${qaScores.total.score.toFixed(1)}%)
- Account Verification (${accountVerification.verificationScore}%):
  - Client Name Verified: ${accountVerification.clientNameVerified ? 'Yes' : 'No'}
  - Details: ${accountVerification.verificationDetails}
  - Static/Non-Static Asked: ${accountVerification.staticQuestionsAsked}/${accountVerification.nonStaticQuestionsAsked}
- Empathy (${empathy.empathyScore}%):
  - Suggestions: ${empathy.suggestedPhrases.length > 0 ? `"${empathy.suggestedPhrases.join('", "')}"` : 'None'}
  - Sentiment Alignment: ${empathy.sentimentAlignment}
`;

  } else { // internet_cable or default
    let troubleshootingScoreText = '';
    if (result.troubleshootingFlow && result.troubleshootingFlow.length > 0 && troubleshootingFeedback) {
        const totalSteps = result.troubleshootingFlow.length;
        const applicableSteps = totalSteps - Object.values(troubleshootingFeedback).filter(status => status === 'na').length;
        const followedSteps = Object.values(troubleshootingFeedback).filter(status => status === 'checked').length;
        
        if (applicableSteps > 0) {
            const percentage = (followedSteps / applicableSteps) * 100;
            troubleshootingScoreText = `Score: ${followedSteps}/${applicableSteps} (${percentage.toFixed(0)}%)`;
        } else {
            troubleshootingScoreText = `Score: N/A`;
        }
    }

    const troubleshootingStepsFormatted = result.troubleshootingFlow && result.troubleshootingFlow.length > 0
      ? result.troubleshootingFlow.map((step, i) => `  ${i + 1}. ${step} ${troubleshootingFeedback ? getStatusText(troubleshootingFeedback[i]) : ''}`).join('\n')
      : '  None';

    rootCauseAndTroubleshootingSection = `
ROOT CAUSE & TROUBLESHOOTING
${troubleshootingScoreText ? `${troubleshootingScoreText}\n` : ''}- Root Cause: ${result.rootCause}
- Troubleshooting Steps:
${troubleshootingStepsFormatted}
`;

    corePillarsSection = `
CORE PILLAR PERFORMANCE (Call Quality Score: ${qaScores.total.score.toFixed(1)}%)
- Procedure Flow (${procedureFlow?.adherenceScore || 'N/A'}%):
  - Deviations: ${procedureFlow?.deviations && procedureFlow.deviations.length > 0 ? procedureFlow.deviations.join(', ') : 'None'}
  - Efficiency: ${procedureFlow?.efficiencyGains || 'N/A'}
- Ownership (${ownership?.ownershipScore || 'N/A'}%):
  - Suggestions: ${ownership?.suggestedPhrases && ownership.suggestedPhrases.length > 0 ? `"${ownership.suggestedPhrases.join('", "')}"` : 'None'}
  - Opportunities: ${ownership?.missedOpportunities || 'N/A'}
- Empathy (${empathy.empathyScore}%):
  - Suggestions: ${empathy.suggestedPhrases.length > 0 ? `"${empathy.suggestedPhrases.join('", "')}"` : 'None'}
  - Sentiment Alignment: ${empathy.sentimentAlignment}
`;
  }

  const text = `
Analysis for: ${fileName}
--------------------------------------------------

CALL DETAILS
- Agent Name: ${result.callDetails.agentName}
- Call ID: ${result.callDetails.callId}
- Date & Time: ${safeFormatDate(result.callDetails.callDateTime)}
- Duration: ${result.callDetails.callDuration}

SUMMARY
${result.summary}

KEY INSIGHTS
- Call Type: ${result.callType}
- Call Outcome: ${result.resolution.issueResolved ? 'Resolved' : 'Not Resolved'} (${result.resolution.reasonDetail})

${corePillarsSection.trim()}
${rootCauseAndTroubleshootingSection.trim()}

OVERALL FINDINGS
- Opportunities: ${result.overallFindings.opportunities}
- Recommendations: ${result.overallFindings.recommendations}
${note ? `\nNOTES & COMMENTS\n${note}` : ''}
`;
  return text.trim();
};

const escapeCsvField = (field: string | number | boolean | null | undefined): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

export const formatAllAnalysesAsCsv = (results: AnalysisResult[]): string => {
  const headers = [
    'callId', 'agentName', 'callDateTime', 'callDuration', 'callType', 'rootCause', 'summary',
    'issueResolved', 'resolutionReasonCategory', 'resolutionReasonDetail', 'holdOrSilenceCount',
    'callQualityScorePercent', 'procedureFlowScore', 'ownershipScore', 'empathyScore',
    'procedureFlowDeviations', 'ownershipSuggestedPhrases', 'empathySuggestedPhrases',
    'customerSentimentPositivePercent', 'customerSentimentNegativePercent',
    'opportunities', 'recommendations'
  ];

  const headerRow = headers.map(escapeCsvField).join(',');

  const dataRows = results.map(result => {
    const qaScores = calculateQaScores(result);
    const { procedureFlow, ownership, empathy } = result.agentPerformance.corePillars;
    const data = [
      result.callDetails.callId,
      result.callDetails.agentName,
      result.callDetails.callDateTime,
      result.callDetails.callDuration,
      result.callType,
      result.rootCause,
      result.summary,
      result.resolution.issueResolved,
      result.resolution.reasonCategory,
      result.resolution.reasonDetail,
      result.holdOrSilenceCount,
      qaScores.total.score.toFixed(2),
      procedureFlow?.adherenceScore,
      ownership?.ownershipScore,
      empathy.empathyScore,
      procedureFlow?.deviations.join('; '),
      ownership?.suggestedPhrases.join('; '),
      empathy.suggestedPhrases.join('; '),
      result.customerSentiment.positivePercentage,
      result.customerSentiment.negativePercentage,
      result.overallFindings.opportunities,
      result.overallFindings.recommendations,
    ];
    return data.map(escapeCsvField).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

export const findRedFlags = (data: ResultItem[]): RedFlag[] => {
    const flags: RedFlag[] = [];
    
    data.forEach(item => {
        const { result } = item;
        
        const qaScores = calculateQaScores(result);
        const qaPercent = qaScores.total.score;
        
        if (result.agentBehaviorComplaint?.detected && qaPercent < 50) {
            flags.push({
                callId: result.callDetails.callId,
                agentName: result.callDetails.agentName,
                reason: 'Customer Complaint about Agent Behavior',
                quote: result.agentBehaviorComplaint.customerComplaintQuote,
            });
        }
    });
    
    return flags;
};

export const findCommendations = (data: ResultItem[]): Commendation[] => {
    const commendations: Commendation[] = [];
    
    data.forEach(item => {
        const { result } = item;
        
        const qaScores = calculateQaScores(result);
        const qaPercent = qaScores.total.score;

        if (
            result.agentCommendation?.detected && 
            result.agentCommendation.customerPraiseQuote &&
            qaPercent > 90
        ) {
            commendations.push({
                callId: result.callDetails.callId,
                agentName: result.callDetails.agentName,
                quote: result.agentCommendation.customerPraiseQuote,
            });
        }
    });
    
    return commendations;
};

export const splitTranscript = (transcript: string): { header: string; dialogue: string } => {
    const lines = transcript.split('\n');
    
    // Find the line that equals "Call Transcript:", case-insensitively.
    const separatorLineIndex = lines.findIndex(line => line.trim().toLowerCase() === 'call transcript:');

    if (separatorLineIndex === -1) {
        // Fallback to original logic if "Call Transcript:" is not found.
        const headerKeywords = ['agent name', 'call id', 'callid', 'date', 'time', 'duration', 'filename'];
        const dialogueStartIndex = lines.findIndex(line => {
            const lowerLine = line.toLowerCase();
            if (!lowerLine.includes(':')) {
                return false;
            }
            const partBeforeColon = lowerLine.split(':')[0].trim();
            if (!partBeforeColon) return false;
            const isHeaderLine = headerKeywords.some(keyword => partBeforeColon.includes(keyword));
            return !isHeaderLine;
        });

        if (dialogueStartIndex === -1) {
            // If no dialogue line is found, assume no header.
            return { header: '', dialogue: transcript };
        }

        const header = lines.slice(0, dialogueStartIndex).join('\n');
        const dialogue = lines.slice(dialogueStartIndex).join('\n');
        return { header, dialogue };
    }

    // "Call Transcript:" and everything before it is the header.
    const header = lines.slice(0, separatorLineIndex + 1).join('\n');
    // Everything after is the dialogue.
    const dialogue = lines.slice(separatorLineIndex + 1).join('\n');
    
    return { header, dialogue };
};
