import React from 'react';
import { Logo } from './Logo';
import { AntennaIcon } from './icons/AntennaIcon';
import { AccountIcon } from './icons/AccountIcon';

interface CampaignSelectionProps {
  onCampaignSelect: (campaign: 'internet_cable' | 'banking') => void;
  availableCampaigns: string[];
}

const AnalyticsBackground: React.FC = () => (
  <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 bg-slate-950" />
    <div 
        className="absolute inset-0"
        style={{
            backgroundImage: `
                linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
        }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.2)_0%,transparent_70%)]" />
  </div>
);

const CampaignCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="w-full max-w-sm text-left bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-sky-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sky-500/50 group"
  >
    <div className="flex items-center gap-4 mb-4">
      {icon}
      <h3 className="text-2xl font-bold text-sky-400">{title}</h3>
    </div>
    <p className="text-slate-300 leading-relaxed">{description}</p>
    <div className="mt-6 text-right font-semibold text-sky-400 group-hover:text-white transition-colors">
      Select &rarr;
    </div>
  </button>
);

export const CampaignSelection: React.FC<CampaignSelectionProps> = ({ onCampaignSelect, availableCampaigns }) => {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col justify-center items-center p-8">
      <AnalyticsBackground />
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Logo className="w-16 h-16" />
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
            AdvantageCall Interact
          </h1>
        </div>
        <p className="text-xl font-bold text-slate-300">Please select a campaign to continue</p>
      </div>

      <div className="relative z-10 flex flex-wrap justify-center items-center gap-8 mt-16">
        {availableCampaigns.includes('internet_cable') && (
          <CampaignCard
            title="Internet & Cable"
            description="Analyze calls with a focus on technical procedure, troubleshooting accuracy, and first-call resolution rates."
            icon={<AntennaIcon className="w-10 h-10 text-sky-500" />}
            onClick={() => onCampaignSelect('internet_cable')}
          />
        )}
        {availableCampaigns.includes('banking') && (
          <CampaignCard
            title="Banking"
            description="Evaluate interactions based on customer experience, empathy, rapport building, and ownership of client issues."
            icon={<AccountIcon className="w-10 h-10 text-sky-500" />}
            onClick={() => onCampaignSelect('banking')}
          />
        )}
      </div>
    </div>
  );
};