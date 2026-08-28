import React from 'react';
import { Bot, Sparkles, MessageSquare, User, Radio, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PersonaProfile, DiscordBotStatus } from '../types';

interface HeaderProps {
  activePersona: PersonaProfile;
  botStatus: DiscordBotStatus;
  activeTab: 'simulator' | 'persona' | 'setup' | 'logs';
  setActiveTab: (tab: 'simulator' | 'persona' | 'setup' | 'logs') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePersona,
  botStatus,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400 flex items-center justify-center shadow-inner">
              <Bot className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">Discord AI Identity Bot</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mention Trigger Mode
                </span>
                <span className="hidden lg:inline-flex px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full items-center gap-1">
                  Gemini Free Tier
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Currently imitating: <span className="font-medium text-slate-200">{activePersona.name}</span>
              </p>
            </div>
          </div>

          {/* Discord Gateway Connection Badge */}
          <div className="hidden md:flex items-center space-x-3">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-2 ${
              botStatus.isConnected
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${botStatus.isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>
                {botStatus.isConnected
                  ? `Live Discord: @${botStatus.botUser?.username || 'Bot'}`
                  : 'Discord Gateway: Off (Simulator Ready)'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Discord Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('persona')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'persona'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Persona Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'setup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Discord Server Bot</span>
              <span className="sm:hidden">Server Bot</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Bot Activity Logs</span>
              <span className="sm:hidden">Logs</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
