


import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, AnalyticsSummary, User, WordTimestamp } from '../types';

export async function analyzeTranscript(transcript: string, campaign: string): Promise<AnalysisResult> {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  let prompt: string;
  let schema: any;

  if (campaign === 'banking') {
    const bankingCallTypeSchema = {
        type: Type.STRING,
        description: `Categorize the call into one of the following predefined categories for Banking. Choose the most relevant category.
Allowed categories:
- Account Balance Inquiry
- Transaction History Request
- Report Lost/Stolen Card
- Fraud/Dispute a Charge
- Online Banking Support
- New Account Opening
- Loan/Credit Inquiry
- General Information`
    };

    schema = {
      type: Type.OBJECT,
      properties: {
        callDetails: {
          type: Type.OBJECT,
          description: "Key details about the call extracted from the transcript. If a detail is not present, provide a reasonable default like 'N/A' or a placeholder.",
          properties: {
            agentName: { type: Type.STRING, description: "The name of the call center agent." },
            callId: { type: Type.STRING, description: "The unique identifier for the call." },
            callDuration: { type: Type.STRING, description: "The total duration of the call in MM:SS format." },
            callDateTime: { type: Type.STRING, description: "The date and time the call took place, in ISO 8601 format." },
          },
          required: ['agentName', 'callId', 'callDuration', 'callDateTime']
        },
        summary: { type: Type.STRING, description: "A brief summary of the entire call." },
        callType: bankingCallTypeSchema,
        rootCause: { type: Type.STRING, description: "The underlying reason for the customer's call after investigation." },
        customerSentiment: {
          type: Type.OBJECT,
          description: "Analysis of the customer's sentiment throughout the call, based on their statements only (not the agent's). The sum of percentages should be close to 100.",
          properties: {
            positivePercentage: { type: Type.NUMBER, description: "The percentage of the customer's statements that were positive. An integer between 0 and 100." },
            negativePercentage: { type: Type.NUMBER, description: "The percentage of the customer's statements that were negative. An integer between 0 and 100." },
            positiveCount: { type: Type.INTEGER, description: "The total count of distinct positive statements made by the customer." },
            negativeCount: { type: Type.INTEGER, description: "The total count of distinct negative statements made by the customer." },
          },
          required: ['positivePercentage', 'negativePercentage', 'positiveCount', 'negativeCount']
        },
        holdOrSilenceCount: { type: Type.INTEGER, description: "The number of times the agent placed the customer on hold or there were significant periods of silence." },
        agentPerformance: {
          type: Type.OBJECT,
          properties: {
            corePillars: {
              type: Type.OBJECT,
              description: "Detailed analysis of the agent's performance based on the core pillars for the banking campaign.",
              properties: {
                  accountVerification: {
                      type: Type.OBJECT,
                      properties: {
                        clientNameVerified: { type: Type.BOOLEAN, description: "True if the agent asked for the client's full name or if the client proactively provided it. This is a mandatory first step." },
                        verificationScore: { type: Type.INTEGER, description: "Score from 0-100. The score is 100 ONLY IF the verification process was explicitly triggered (agent asks for name AND uses security phrase) AND at least 2 static and 2 non-static questions were asked. Otherwise, the score is 0 (auto-fail)." },
                        staticQuestionsAsked: { type: Type.INTEGER, description: "The total number of valid static verification questions the agent asked, excluding the client's name and phone number." },
                        nonStaticQuestionsAsked: { type: Type.INTEGER, description: "The total number of valid non-static verification questions the agent asked, excluding phone number." },
                        passedVerification: { type: Type.BOOLEAN, description: "True if the customer ultimately passed the full security verification process." },
                        verificationDetails: { type: Type.STRING, description: "Brief details on the verification process, noting if it was triggered, if name verification was met, and if the required number of static (2) and non-static (2) questions were asked." }
                      },
                      required: ['clientNameVerified', 'verificationScore', 'staticQuestionsAsked', 'nonStaticQuestionsAsked', 'passedVerification', 'verificationDetails']
                  },
                  empathy: {
                    type: Type.OBJECT,
                    properties: {
                      empathyScore: { type: Type.INTEGER, description: "Score from 0-100 on the agent's display of genuine empathy." },
                      suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 1-2 examples of specific, empathetic statements the agent could have used that would be appropriate for the customer's sentiment." },
                      sentimentAlignment: { type: Type.STRING, description: "Analysis of whether the agent's tone and language appropriately matched the customer's emotional state throughout the call." }
                    },
                    required: ['empathyScore', 'suggestedPhrases', 'sentimentAlignment']
                  }
              },
              required: ['empathy']
            }
          },
          required: ['corePillars']
        },
        resolution: {
          type: Type.OBJECT,
          properties: {
            issueResolved: { type: Type.BOOLEAN, description: "True if the agent resolved the customer's issue." },
            resolutionLanguage: { type: Type.STRING, description: "The specific phrase or language used by the customer confirming resolution. Null if not resolved." },
            reasonCategory: { type: Type.STRING, description: "A short, 3-4 word category for the reason why the issue was or was not resolved. This is used for charting. Examples: 'Information Provided', 'Transaction Completed', 'Escalated to Specialist'." },
            reasonDetail: { type: Type.STRING, description: "A concise but specific explanation for why the issue was or was not resolved. If not resolved, this reason is CRITICAL." }
          },
          required: ['issueResolved', 'resolutionLanguage', 'reasonCategory', 'reasonDetail']
        },
        understandabilityIssues: {
          type: Type.OBJECT,
          description: "Analysis of any issues the customer had understanding the agent.",
          properties: {
            notUnderstandingInfo: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                samplePhrase: { type: Type.STRING }
              },
              required: ['detected', 'samplePhrase']
            },
            audioVolume: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                samplePhrase: { type: Type.STRING }
              },
              required: ['detected', 'samplePhrase']
            },
            clarityOfSpeech: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                samplePhrase: { type: Type.STRING }
              },
              required: ['detected', 'samplePhrase']
            }
          },
          required: ['notUnderstandingInfo', 'audioVolume', 'clarityOfSpeech']
        },
        securityVerificationAsked: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "An array of strings, where each string is a security verification question asked by the agent, in the sequence they were asked."
        },
        overallFindings: {
          type: Type.OBJECT,
          properties: {
            opportunities: { type: Type.STRING, description: "Areas of opportunity for the agent's improvement based on the call, specifically related to the core pillars for the banking campaign." },
            recommendations: { type: Type.STRING, description: "Specific recommendations to help the agent improve performance on the core pillars for the banking campaign." },
          },
          required: ['opportunities', 'recommendations']
        },
        agentBehaviorComplaint: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            customerComplaintQuote: { type: Type.STRING }
          },
          required: ['detected', 'customerComplaintQuote']
        },
        agentCommendation: {
          type: Type.OBJECT,
          description: "Detects if the customer explicitly praises the agent for exceptional service. IGNORE simple polite phrases like 'thank you' or simple numerical ratings like '10 out of 10' or just the number '10'. FOCUS on genuine, specific, and strong praise such as 'you are phenomenal' or 'best support I have ever received'.",
          properties: {
            detected: { type: Type.BOOLEAN },
            customerPraiseQuote: { type: Type.STRING }
          },
          required: ['detected', 'customerPraiseQuote']
        }
      },
      required: ['callDetails', 'summary', 'callType', 'rootCause', 'customerSentiment', 'holdOrSilenceCount', 'agentPerformance', 'resolution', 'understandabilityIssues', 'securityVerificationAsked', 'overallFindings', 'agentBehaviorComplaint', 'agentCommendation']
    };

    const campaignInstructions = `This transcript is for the "Banking" campaign. The ABSOLUTE PRIORITY for this analysis is **Security and Customer Experience**. Evaluate the agent's adherence to the strict, multi-step security procedure (Account Verification) and their ability to build rapport and show empathy. The 'accountVerification.verificationScore' is an auto-fail (0) if the client's name is not verified, or if the 2 static + 2 non-static question requirement is not met.`;
    const promptBody = `Your primary mission is to evaluate the following call transcript based on the campaign's core pillars.

**CAMPAIGN DIRECTIVE: ${campaignInstructions}**

Key Instructions:
1.  **Initial Call Assessment:** First, determine if the call requires the agent to access the client's account ('Account-Specific Inquiry') or not ('General Inquiry').
    *   **Use this key heuristic for determination:** If an agent asks for the client's name but does NOT use a security phrase (e.g., "for security purposes") and does NOT ask any further static or non-static questions, this is a strong indicator of a **General Inquiry**. Classify it as such. This behavior suggests the agent is personalizing the call without needing to access sensitive data.
    *   **Account-Specific Inquiries:** Involve actions like balance checks, transaction history, reporting a card. These REQUIRE security verification.
    *   **General Inquiries:** Involve topics like website navigation, branch locations, general product questions. These DO NOT require security verification.
2.  **Account Verification Analysis (Conditional):**
    *   **If the call is a General Inquiry:** You MUST OMIT the entire \`accountVerification\` object from your JSON output. This pillar is not applicable.
    *   **If the call is an Account-Specific Inquiry:** You MUST evaluate this pillar. The verification process is only considered formally "triggered" if BOTH of the following conditions are met: (1) The agent asks for the client's name, AND (2) the agent uses phrases like "for security verification," "for security purposes," or similar explicit statements about security before asking other questions. If both conditions are not met, the process was not properly initiated, and the score should be 0.
    *   **Scoring Logic:** The \`verificationScore\` is 100 ONLY IF the process was triggered (as defined above), AND at least 2 static questions were asked, AND at least 2 non-static questions were asked. Otherwise, the score is 0. Note that asking for the client's name is part of the trigger, not a counted verification question.
    *   **Verification Question Rules:**
        *   **A phone number is NOT a valid verification question** and must not be counted as static or non-static.
        *   **Allowed Static Questions:** Card Expiration Date, Credit Limit, Date of Birth, Home Branch, Mailing Address, Main Cardholder’s Name, Middle name or initials, Mother’s Maiden Name, Name of Beneficiary, Name of Dependent, Name of Signatory, Supplementary Cardholder’s Name, Tax Registration Number.
        *   **Allowed Non-Static Questions:** Agent Code, Cash Advance and Amount Debited, Charge of Service, Date of Claim, Date of Service, Investment booking amount, Investment booking date, Last Merchant, Last Statement, Loan Amount, Owners Address, Owners DOB, Payment Amount, Payment method, Policy Number, Premium Amount, Premium Date Paid, Recent current balance, Recent Debit or Withdrawal, Recent Deposit or Payment, Recent Transactions, Type of Service, User ID. A single request for "two recent transactions" or "2 recent transactions" counts as two non-static questions.
3.  **Show Genuine Empathy:** Look for statements that show the agent understands and cares about the customer's situation. Do not mistake politeness for empathy. Score this from 0-100. Provide 1-2 specific, empathetic phrases they *could have used*.
4.  **Security Verification Asked:** If the verification process was triggered, list the exact security/verification questions the agent asked the customer in sequential order.
5.  **Resolution Reason:** For the 'resolution' object, it is MANDATORY to provide both a short 'reasonCategory' and a clear 'reasonDetail' explaining *why* the issue was or was not resolved.
6.  **Overall Findings (Opportunities & Recommendations):**
    *   **Primary Focus on Customer Experience:** The main goal of feedback is to improve the overall customer experience. Prioritize how the agent can build rapport, show empathy, and communicate clearly.
    *   **Conditional Verification Feedback:** Only provide feedback on the security verification process if the \`accountVerification\` pillar was applicable AND its score is less than 100.
    *   **If Verification is Not Applicable:** If the \`accountVerification\` pillar was omitted (General Inquiry), your feedback MUST NOT mention verification. Focus entirely on other performance areas like empathy, clarity, or missed opportunities.`;

    prompt = `You are an expert call center quality assurance analyst for the banking industry. Provide a detailed analysis in JSON format based on the provided schema.

${promptBody}

Transcript:
---
${transcript}
---`;

  } else { // Default to 'internet_cable' campaign
    const callTypeSchema = {
        type: Type.STRING,
        description: `Categorize the call into one of the following predefined categories for Internet & Cable. Choose the most relevant category. For example, if the customer mentions 'Eero' or 'wifi', it falls under 'Internet Service Inquiry'. If they mention 'TV not working', it's 'Cable'. If they mention 'TiVo', it's 'TiVo Cable'.
Allowed categories:
- Internet Service Inquiry
- Cable
- Technician Inquiry
- Equipment Activation
- TiVo Cable
- Service Interruptions
- Email Issues
- Home phone Support
- My Account Inquiries
- Unsupported EL Inquiries
- Streaming App
- Bill Adjustments Inquiries
- Maestro Inquiry
- Mobile Inquiries`
    };

    schema = {
      type: Type.OBJECT,
      properties: {
        callDetails: {
          type: Type.OBJECT,
          description: "Key details about the call extracted from the transcript. If a detail is not present, provide a reasonable default like 'N/A' or a placeholder.",
          properties: {
            agentName: { type: Type.STRING, description: "The name of the call center agent." },
            callId: { type: Type.STRING, description: "The unique identifier for the call." },
            callDuration: { type: Type.STRING, description: "The total duration of the call in MM:SS format." },
            callDateTime: { type: Type.STRING, description: "The date and time the call took place, in ISO 8601 format." },
          },
          required: ['agentName', 'callId', 'callDuration', 'callDateTime']
        },
        summary: { type: Type.STRING, description: "A brief summary of the entire call." },
        callType: callTypeSchema,
        rootCause: { type: Type.STRING, description: "The underlying reason for the customer's call after investigation." },
        customerSentiment: {
          type: Type.OBJECT,
          description: "Analysis of the customer's sentiment throughout the call, based on their statements only (not the agent's). The sum of percentages should be close to 100.",
          properties: {
            positivePercentage: { type: Type.NUMBER, description: "The percentage of the customer's statements that were positive. An integer between 0 and 100." },
            negativePercentage: { type: Type.NUMBER, description: "The percentage of the customer's statements that were negative. An integer between 0 and 100." },
            positiveCount: { type: Type.INTEGER, description: "The total count of distinct positive statements made by the customer." },
            negativeCount: { type: Type.INTEGER, description: "The total count of distinct negative statements made by the customer." },
          },
          required: ['positivePercentage', 'negativePercentage', 'positiveCount', 'negativeCount']
        },
        holdOrSilenceCount: { type: Type.INTEGER, description: "The number of times the agent placed the customer on hold or there were significant periods of silence." },
        agentPerformance: {
          type: Type.OBJECT,
          properties: {
            corePillars: {
              type: Type.OBJECT,
              description: "Detailed analysis of the agent's performance based on the core pillars of service for the specified campaign.",
              properties: {
                  procedureFlow: {
                      type: Type.OBJECT,
                      properties: {
                        adherenceScore: { type: Type.INTEGER, description: "Score from 0-100 on how well the agent followed the required procedure." },
                        keySteps: {
                          type: Type.ARRAY,
                          description: "A list of key procedural steps and whether they were completed.",
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              stepName: { type: Type.STRING, description: "Name of the procedural step (e.g., 'Greeting & Branding', 'Customer Verification', 'Troubleshooting', 'Proper Closing')." },
                              completed: { type: Type.BOOLEAN, description: "True if the agent completed this step correctly." },
                              details: { type: Type.STRING, description: "Brief details on how the agent performed the step, or why it was missed." }
                            },
                            required: ['stepName', 'completed', 'details']
                          }
                        },
                        deviations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of specific steps missed or where the agent significantly deviated from the expected flow." },
                        efficiencyGains: { type: Type.STRING, description: "Analysis of how following (or not following) the procedure impacted call time and efficiency. E.g., 'Following the flow led to a quick resolution in under 5 minutes.'" }
                      },
                      required: ['adherenceScore', 'keySteps', 'deviations', 'efficiencyGains']
                    },
                    ownership: {
                      type: Type.OBJECT,
                      properties: {
                        ownershipScore: { type: Type.INTEGER, description: "Score from 0-100 on how well the agent took ownership of the customer's issue." },
                        suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 1-2 examples of specific phrases the agent could have used to demonstrate stronger ownership, especially if opportunities were missed." },
                        missedOpportunities: { type: Type.STRING, description: "A summary of moments where the agent could have taken more ownership but didn't." }
                      },
                      required: ['ownershipScore', 'suggestedPhrases', 'missedOpportunities']
                    },
                    empathy: {
                      type: Type.OBJECT,
                      properties: {
                        empathyScore: { type: Type.INTEGER, description: "Score from 0-100 on the agent's display of genuine empathy." },
                        suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 1-2 examples of specific, empathetic statements the agent could have used that would be appropriate for the customer's sentiment." },
                        sentimentAlignment: { type: Type.STRING, description: "Analysis of whether the agent's tone and language appropriately matched the customer's emotional state throughout the call." }
                      },
                      required: ['empathyScore', 'suggestedPhrases', 'sentimentAlignment']
                    }
              },
              required: ['procedureFlow', 'ownership', 'empathy']
            }
          },
          required: ['corePillars']
        },
        resolution: {
          type: Type.OBJECT,
          properties: {
            issueResolved: { type: Type.BOOLEAN, description: "True if the agent resolved the customer's issue." },
            resolutionLanguage: { type: Type.STRING, description: "The specific phrase or language used by the customer confirming resolution. Null if not resolved." },
            reasonCategory: { type: Type.STRING, description: "A short, 3-4 word category for the reason why the issue was or was not resolved. This is used for charting. Examples: 'Technician Visit Required', 'System Outage', 'Customer Follow-up Needed'." },
            reasonDetail: { type: Type.STRING, description: "A concise but specific explanation for why the issue was or was not resolved. If not resolved, this reason is CRITICAL. E.g., 'Resolved by walking the customer through a modem reset.' or 'Not resolved because a technician visit is required and was scheduled.'" }
          },
          required: ['issueResolved', 'resolutionLanguage', 'reasonCategory', 'reasonDetail']
        },
        understandabilityIssues: {
          type: Type.OBJECT,
          description: "Analysis of any issues the customer had understanding the agent.",
          properties: {
            notUnderstandingInfo: {
              type: Type.OBJECT,
              description: "Issues where the customer does not comprehend the agent's explanation or statements.",
              properties: {
                detected: { type: Type.BOOLEAN, description: "True if the customer expresses they do not understand the information provided by the agent." },
                samplePhrase: { type: Type.STRING, description: "A direct quote from the customer indicating their lack of understanding. Null if not detected." }
              },
              required: ['detected', 'samplePhrase']
            },
            audioVolume: {
              type: Type.OBJECT,
              description: "Issues related to the customer's ability to hear the agent due to volume problems.",
              properties: {
                detected: { type: Type.BOOLEAN, description: "True if the customer states they cannot hear the agent properly (e.g., 'I can't hear you', 'you're breaking up')." },
                samplePhrase: { type: Type.STRING, description: "A direct quote from the customer about the audio/volume issue. Null if not detected." }
              },
              required: ['detected', 'samplePhrase']
            },
            clarityOfSpeech: {
              type: Type.OBJECT,
              description: "Issues related to the clarity of the agent's speech, such as accent, language barriers, or speaking too fast.",
              properties: {
                detected: { type: Type.BOOLEAN, description: "True if the customer mentions an accent, language barrier, or that the agent is speaking too quickly." },
                samplePhrase: { type: Type.STRING, description: "A direct quote from the customer about the speech clarity issue. Null if not detected." }
              },
              required: ['detected', 'samplePhrase']
            }
          },
          required: ['notUnderstandingInfo', 'audioVolume', 'clarityOfSpeech']
        },
        troubleshootingFlow: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "An array of strings, where each string is a step in the troubleshooting procedure provided by the agent."
        },
        overallFindings: {
          type: Type.OBJECT,
          properties: {
            opportunities: { type: Type.STRING, description: "Areas of opportunity for the agent's improvement based on the call, specifically related to the core pillars for the campaign." },
            recommendations: { type: Type.STRING, description: "Specific recommendations to help the agent improve performance on the core pillars for the campaign." },
          },
          required: ['opportunities', 'recommendations']
        },
        agentBehaviorComplaint: {
          type: Type.OBJECT,
          description: "Detects if the customer explicitly complains about the agent's behavior (e.g., rudeness, being unhelpful, bad attitude). This is not about the issue itself, but the agent's conduct.",
          properties: {
            detected: { type: Type.BOOLEAN, description: "True if a direct complaint from the customer about the agent's behavior is found in the transcript." },
            customerComplaintQuote: { type: Type.STRING, description: "The specific quote from the customer where they are complaining about the agent. Null if not detected." }
          },
          required: ['detected', 'customerComplaintQuote']
        },
        agentCommendation: {
          type: Type.OBJECT,
          description: "Detects if the customer explicitly praises the agent for exceptional service that goes beyond a standard polite 'thank you'. IGNORE simple phrases like 'thank you so much' or 'thanks a lot'. FOCUS on genuine, specific, and strong praise such as 'you are phenomenal', 'you are awesome', 'you deserve a raise', or 'best support I have ever received'.",
          properties: {
            detected: { type: Type.BOOLEAN, description: "True if a direct, strong praise from the customer about the agent's service is found." },
            customerPraiseQuote: { type: Type.STRING, description: "The specific quote from the customer where they are praising the agent. Null if not detected." }
          },
          required: ['detected', 'customerPraiseQuote']
        }
      },
      required: ['callDetails', 'summary', 'callType', 'rootCause', 'customerSentiment', 'holdOrSilenceCount', 'agentPerformance', 'resolution', 'understandabilityIssues', 'troubleshootingFlow', 'overallFindings', 'agentBehaviorComplaint', 'agentCommendation']
    };

    const campaignInstructions = `This transcript is for the "Internet & Cable" campaign. The ABSOLUTE PRIORITY for this analysis is **Issue Resolution**. Evaluate the agent's technical accuracy, the logic of their troubleshooting flow, and whether they successfully resolved the customer's problem on the first call. The 'procedureFlow' score should heavily reflect the quality of technical support. The 'resolution.reasonDetail' must be extremely clear about the technical outcome.`;
    const promptBody = `Your primary mission is to evaluate the following call transcript based on three mandatory core pillars: Procedure Flow, Ownership, and Empathy. These are not optional and are the main focus of the analysis.

**CAMPAIGN DIRECTIVE: ${campaignInstructions}**

Key Instructions:
1.  **Procedure Flow:** Evaluate if the agent strictly followed the company's prescribed steps. The score should be heavily based on the effectiveness of the troubleshooting or action steps provided by the agent. If the steps were performed correctly, logically, and either resolved the issue or correctly identified that it required escalation (like a technician visit), the score should be high. If key steps were missed, performed incorrectly, or were inefficient, the score must be lower. Score their adherence from 0-100.
2.  **Take Ownership:** Analyze if the agent took full charge of the customer's problem. Look for proactive language and assurance. Score their performance from 0-100. Provide 1-2 specific, actionable phrases they *could have used* to demonstrate stronger ownership.
3.  **Show Genuine Empathy:** Look for statements that show the agent understands and cares about the customer's frustration. Do not mistake politeness for empathy. Score this from 0-100. Provide 1-2 specific, empathetic phrases they *could have used*.
4.  **Resolution Reason:** For the 'resolution' object, it is MANDATORY to provide both a short 'reasonCategory' and a clear 'reasonDetail' explaining *why* the issue was or was not resolved. If the issue was NOT resolved, this information is the most important piece of information for this section.`;

    prompt = `You are an expert call center quality assurance analyst. Provide a detailed analysis in JSON format based on the provided schema.

${promptBody}

Transcript:
---
${transcript}
---`;
  }


  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
      },
    });
    
    if (!response || !response.text) {
        console.error("Gemini API response for analysis was empty or malformed:", JSON.stringify(response, null, 2));
        throw new Error("The AI model failed to return a valid analysis. This might be due to content filtering or an internal model error.");
    }
    
    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("The AI model returned an empty response. This might be due to content filtering or an internal model error.");
    }
    return JSON.parse(jsonText) as AnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze transcript. API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}

const highlightsSchema = {
  type: Type.OBJECT,
  properties: {
    highlights: {
      type: Type.ARRAY,
      description: 'An array of 3-4 concise, actionable key highlights for a call center manager.',
      items: {
        type: Type.OBJECT,
        properties: {
          emoji: { type: Type.STRING, description: 'An appropriate emoji to represent the highlight (e.g., 💡, 📈, 📉, 🎯).' },
          text: { type: Type.STRING, description: 'The highlight text, which should be insightful and easy to understand. It must include a brief, actionable recommendation.' }
        },
        required: ['emoji', 'text']
      }
    }
  },
  required: ['highlights']
};

export async function generateHighlights(summary: AnalyticsSummary, campaign: string): Promise<{emoji: string, text: string}[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const basePrompt = `You are a senior call center operations analyst. Based on the following summary of call data, generate 3-4 concise, actionable key highlights for a manager.`;

  let promptInstructions = '';
  let summaryText = '';

  if (campaign === 'banking') {
    promptInstructions = `Your entire focus must be on **Customer Dissatisfaction**.

1.  **Analyze Dissatisfaction Drivers:** Deeply analyze the "Top Reasons for Dissatisfaction". How do these reasons correlate with low Verification Scores or Empathy Scores?
2.  **Assess Impact:** Explain how these issues are impacting the customer experience and trust in the bank.
3.  **Provide Actionable Recommendations:** For each highlight, provide a specific, actionable recommendation focused on improving security procedures (Verification Score) and showing genuine empathy to reduce dissatisfaction.`;
    
    summaryText = `- Total Calls Analyzed: ${summary.totalCalls}
- Average Verification Score: ${summary.avgVerificationScore.toFixed(1)}%
- Average Empathy Score: ${summary.avgEmpathyScore.toFixed(1)}%
- Top Call Driver: ${summary.topCallDriver ? `${summary.topCallDriver.label} (${((summary.topCallDriver.value / summary.totalCalls) * 100).toFixed(1)}% of calls)` : 'N/A'}
- Top Reasons for Dissatisfaction: ${summary.dissatisfactionReasonCounts && summary.dissatisfactionReasonCounts.length > 0 ? summary.dissatisfactionReasonCounts.map(r => `${r.reason} (${r.count} calls)`).join(', ') : 'N/A'}`;
  } else { // internet_cable
    promptInstructions = `Your entire focus must be on **Issue Resolution** and the **Top Reasons for Unresolved Calls**.

1.  **Analyze the Drivers:** Deeply analyze the provided "Top Reasons for Unresolved Calls". What is driving these unresolved calls? Is there a correlation with the Top Call Driver or low scores in the core pillars?
2.  **Assess Impact:** Explain how these top unresolved reasons are impacting the overall Issue Resolution rate and the customer experience.
3.  **Provide Actionable Recommendations:** For each key highlight, provide a specific, forward-looking recommendation on how to improve the resolution rate.`;
    
    summaryText = `- Total Calls Analyzed: ${summary.totalCalls}
- Overall Resolution Rate: ${summary.resolutionRate.toFixed(1)}%
- Average Procedure Flow Score: ${summary.avgProcedureFlowScore.toFixed(1)}%
- Average Ownership Score: ${summary.avgOwnershipScore.toFixed(1)}%
- Average Empathy Score: ${summary.avgEmpathyScore.toFixed(1)}%
- Top Call Driver: ${summary.topCallDriver ? `${summary.topCallDriver.label} (${((summary.topCallDriver.value / summary.totalCalls) * 100).toFixed(1)}% of calls)` : 'N/A'}
- Top Reasons for Unresolved Calls: ${summary.unresolvedReasonCounts && summary.unresolvedReasonCounts.length > 0 ? summary.unresolvedReasonCounts.map(r => `${r.reason} (${r.count} calls)`).join(', ') : 'N/A'}`;
  }


  const prompt = `${basePrompt}
${promptInstructions}

Analytics Summary:
${summaryText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: highlightsSchema,
        temperature: 0.3,
      },
    });
    
    if (!response || !response.text) {
        console.error("Gemini API response for highlights was empty or malformed:", JSON.stringify(response, null, 2));
        throw new Error("The AI model failed to return valid highlights. This might be due to content filtering or an internal model error.");
    }
    
    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("The AI model returned an empty response for highlights. This might be due to content filtering or an internal model error.");
    }
    const parsed = JSON.parse(jsonText) as { highlights: { emoji: string, text: string }[] };
    return parsed.highlights;

  } catch (error) {
    console.error("Error calling Gemini API for highlights:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate highlights. API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}


const timestampsSchema = {
    type: Type.OBJECT,
    properties: {
        timestamps: {
            type: Type.ARRAY,
            description: "An array of objects, each representing a word with its start and end time in seconds.",
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING, description: "The word from the transcript. For silence markers like '(2s silence)', use the special word 'SILENCE'." },
                    startTime: { type: Type.NUMBER, description: "The start time of the word in seconds." },
                    endTime: { type: Type.NUMBER, description: "The end time of the word in seconds." }
                },
                required: ['word', 'startTime', 'endTime']
            }
        }
    },
    required: ['timestamps']
};


export async function generateTranscriptTimestamps(header: string, dialogue: string, duration: number): Promise<WordTimestamp[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert audio-to-text alignment tool. Your task is to generate a precise, word-by-word timestamp array for a given transcript and its total audio duration.

The total audio duration is ${duration.toFixed(2)} seconds. The transcript is split into a non-spoken 'header' and a spoken 'dialogue'.

Your instructions are:
1.  The output must be an array of objects, where each object has 'word', 'startTime', and 'endTime' in seconds.
2.  The timeline is continuous. The 'endTime' of one word is the 'startTime' of the next.
3.  The very first 'startTime' should account for any initial silence or non-dialogue in the 'header'. A typical header is 2-5 seconds. An empty header should have a startTime of 0.
4.  Handle silence markers: For markers like '(2s silence)', the 'word' in the JSON MUST be 'SILENCE', and the duration ('endTime' - 'startTime') must be exactly 2 seconds.
5.  The 'endTime' of the very last word MUST equal the total audio duration: ${duration.toFixed(2)} seconds.

METADATA HEADER:
---
${header}
---

SPOKEN DIALOGUE:
---
${dialogue}
---

Total Audio Duration: ${duration.toFixed(2)} seconds.

Provide the output in JSON format based on the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: timestampsSchema,
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 8192 }
      },
    });
    
    if (!response || !response.text) {
        console.error("Gemini API response for timestamps was empty or malformed:", JSON.stringify(response, null, 2));
        throw new Error("The AI model failed to return a valid timestamp response. This might be due to content filtering or an internal model error.");
    }
    
    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("The AI model returned an empty response for timestamps. This might be due to content filtering or an internal model error.");
    }
    
    const parsed = JSON.parse(jsonText) as { timestamps: WordTimestamp[] };
    return parsed.timestamps;

  } catch (error) {
    console.error("Error calling Gemini API for timestamps:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate timestamps. API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating timestamps.");
  }
}

export async function maskPiiInTranscript(transcript: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a highly advanced PII (Personally Identifiable Information) detection and masking tool. Your task is to review the following text transcript and mask any sensitive personal information.

**Masking Instructions:**
You MUST adhere to the following formats precisely. Do not deviate.

- **Names:** Keep the first name visible but mask the last name (e.g., "John Santos" becomes "John [LASTNAME]"). This applies to all names **EXCEPT** for the Agent's name in the transcript metadata (e.g., the name following "Agent Name:"), which must not be masked.
- **Usernames:** Mask completely. Example: "jsantos23" becomes "[USERNAME]".
- **Passwords:** Mask completely. Example: "MyPa55w0rd" becomes "[PASSWORD]".
- **Email addresses:** Mask completely. Example: "john.santos@email.com" becomes "[EMAIL]".
- **Phone numbers:** Mask completely. Example: "555-123-4567" becomes "[PHONE]".
- **Home or work addresses:** Mask completely. Example: "123 Main St, Anytown" becomes "[ADDRESS]".
- **Identification or passport numbers:** Mask completely. Example: "A12345678" becomes "[ID]".
- **Credit or debit card numbers:** Mask completely but show only the last four digits. Example: "4111-1111-1111-1234" becomes "[CARD: **** **** **** 1234]".
- **PINs or access codes:** Mask completely. Example: "My PIN is 1234" becomes "My PIN is [PIN/CODE]".

**Crucial Rules:**
1.  **Do not change non-sensitive content.** The goal is to protect personal data while keeping the text contextually understandable.
2.  **Preserve the original structure and dialogue.** Do not summarize or alter the conversation flow. The output must be the full transcript, but with PII masked.
3.  **Be thorough.** Scan for any data that could identify an individual, including contact details, addresses, identification numbers, financial details, and access credentials.
4.  **IMPORTANT EXCEPTION: Do not mask metadata identifiers like Call IDs or Eureka IDs.** These are essential for locating the call and must remain visible. They typically appear after labels like "Call ID:" or "Eureka ID:" and are alphanumeric.

**Transcript to process:**
---
${transcript}
---

Return ONLY the masked transcript. Do not add any introductory text, confirmation messages, or explanations.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.0,
      },
    });

    if (!response || !response.text) {
      console.error("Gemini API response for PII masking was empty or malformed:", JSON.stringify(response, null, 2));
      throw new Error("The AI model failed to return a valid masked transcript.");
    }
    
    return response.text.trim();

  } catch (error) {
    console.error("Error calling Gemini API for PII masking:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to mask PII. API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while masking PII.");
  }
}
