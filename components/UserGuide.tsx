import React from 'react';
import type { User } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface UserGuideProps {
    user: User;
}

const guideContent: Partial<Record<User['accessLevel'], string>> = {
    Admin: `Welcome to AdvantageCall Interact! As an Admin, you have full access to all features, allowing you to manage users, upload data, and gain comprehensive insights into your call center operations. Below is a guide to the features available to you:

DASHBOARD

*   **Purpose:** View high-level analytics, charts, and key performance indicators (KPIs) across your entire operation.
*   **How to Use:** Navigate to the Dashboard tab to get an immediate overview of call performance, agent activity, and emerging trends. This serves as your central monitoring hub.

SEARCH & REVIEW

*   **Purpose:** A powerful search tool to find specific call transcripts and review their detailed analysis.
*   **How to Use:** Use the Search & Review feature to locate calls based on various criteria such as agent, date, customer sentiment, or keywords. You can then deep dive into individual call recordings and their associated analytics.

COACH & ACKNOWLEDGE

*   **Purpose:** A dedicated area for managing and conducting coaching interactions. Admins can share calls with Team Leads and Agents for review. Agents can then acknowledge these shared calls.
*   **How to Use:** As an Admin, you can initiate coaching cycles by sharing specific call recordings with Team Leads or individual Agents. Monitor the progress of coaching sessions and ensure agents are reviewing and acknowledging their assigned calls.

DATA FEED

*   **Purpose:** Upload new call transcripts for analysis by the AdvantageCall Interact system.
*   **How to Use:** Utilize the Data Feed feature to regularly upload batches of new call transcripts. This ensures the platform has the most current data available for analysis, reporting, and ongoing insights.

ADMIN

*   **Purpose:** Manage all aspects of user accounts within the AdvantageCall Interact platform, including creating, editing, and deactivating user accounts.
*   **How to Use:** Access the Admin section to manage user roles and permissions. You can create new user accounts, modify existing user details, assign different access levels (e.g., Admin, Team Lead, Agent, Viewer), and deactivate accounts as needed. This feature provides complete control over who can access and what they can do within the system.`,
    Manager: `Welcome to AdvantageCall Interact! As a Manager, you have access to key features for overseeing operations, coaching your team, and analyzing performance. Here's a guide to your available tools:

DASHBOARD

*   **Purpose:** View high-level analytics, charts, and key performance indicators (KPIs) across your entire operation.
*   **How to Use:** Navigate to the Dashboard tab to get an immediate overview of call performance, agent activity, and emerging trends. This serves as your central monitoring hub.

SEARCH & REVIEW

*   **Purpose:** A powerful search tool to find specific call transcripts and review their detailed analysis.
*   **How to Use:** Use the Search & Review feature to locate calls based on various criteria such as agent, date, customer sentiment, or keywords. You can then deep dive into individual call recordings and their associated analytics.

COACH & ACKNOWLEDGE

*   **Purpose:** A dedicated area for managing and conducting coaching interactions. You can share calls with Team Leads and Agents for review. Agents can then acknowledge these shared calls.
*   **How to Use:** You can initiate coaching cycles by sharing specific call recordings with Team Leads or individual Agents. Monitor the progress of coaching sessions and ensure agents are reviewing and acknowledging their assigned calls.

DATA FEED

*   **Purpose:** Upload new call transcripts for analysis by the AdvantageCall Interact system.
*   **How to Use:** Utilize the Data Feed feature to regularly upload batches of new call transcripts. This ensures the platform has the most current data available for analysis, reporting, and ongoing insights.`,
    'Team Lead': `Welcome to your user guide for AdvantageCall Interact! As a Team Lead, you have access to powerful tools designed to help you monitor performance, review calls, and coach your team effectively.

Here are the features available to you:

DASHBOARD

The Dashboard provides a comprehensive overview of your team's performance.
*   View high-level analytics, charts, and key performance indicators (KPIs) relevant to your team.
*   Gain quick insights into trends, agent performance, and compliance metrics.
*   Use the data to identify areas for improvement and celebrate successes.

SEARCH & REVIEW

This powerful feature allows you to locate and analyze specific call interactions.
*   Utilize a robust search tool to find call transcripts based on various criteria such as agent name, date range, sentiment, keywords, or specific tags.
*   Click on a search result to open the detailed analysis of a call.
*   Review the full transcript, sentiment analysis, detected keywords, and other relevant data points to understand the interaction thoroughly.
*   Identify examples for coaching, best practices, or compliance issues.

COACH & ACKNOWLEDGE

The Coach & Acknowledge area is central to your team development efforts.
*   **Share Calls for Review:** After reviewing a call using the Search & Review feature, you can share it directly with an Agent. This allows the Agent to listen to or read the specific interaction you want them to focus on.
*   **Provide Feedback:** Attach specific notes or feedback to the shared call, highlighting what went well or areas for improvement.
*   **Track Acknowledgment:** Agents will see calls shared with them and can acknowledge that they have reviewed the call and your feedback. This helps you track their engagement with coaching.
*   Use this tool to facilitate targeted coaching sessions and improve agent performance.`,
    Agent: `Welcome to AdvantageCall Interact! This guide will help you understand the features available to you as an Agent.

COACH & ACKNOWLEDGE

This is a dedicated area for your coaching interactions.
*   **Accessing Shared Calls:** Team Leads and Admins can share specific calls with you for review. You will find these calls listed in the 'Coach & Acknowledge' section.
*   **Reviewing Calls:** Click on a shared call to review its details and any associated feedback or notes from your Team Lead or Admin.
*   **Acknowledging Calls:** After reviewing a shared call and its coaching points, you can mark it as acknowledged. This confirms that you have seen and understood the feedback.`,
};


export const UserGuide: React.FC<UserGuideProps> = ({ user }) => {
    const guide = guideContent[user.accessLevel] || "No user guide is available for your role.";

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <BookOpenIcon className="w-10 h-10 text-sky-400" />
                <div>
                    <h2 className="text-3xl font-bold text-white">User Guide</h2>
                    <p className="text-slate-400">Personalized instructions for your <span className="font-semibold text-sky-300">{user.accessLevel}</span> role.</p>
                </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 min-h-[400px]">
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {guide}
                </div>
            </div>
        </div>
    );
};