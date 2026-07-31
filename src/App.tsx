import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DiscordSimulator } from './components/DiscordSimulator';
import { PersonaStudio } from './components/PersonaStudio';
import { DiscordBotSetup } from './components/DiscordBotSetup';
import { ActivityLogs } from './components/ActivityLogs';
import { PRESET_PERSONAS } from './data/presets';
import { PersonaProfile, DiscordBotStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'persona' | 'setup' | 'logs'>('simulator');
  const [activePersona, setActivePersona] = useState<PersonaProfile>(PRESET_PERSONAS[0]); // Gordon Ramsay default
  const [botStatus, setBotStatus] = useState<DiscordBotStatus>({
    isConnected: false,
    botUser: null,
    guildCount: 0,
    uptimeSeconds: 0,
    lastEventTime: null,
    lastError: null,
  });

  // Fetch bot gateway status from backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (err) {
      // Backend error or offline
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Sync active persona to backend server memory
  const handleSavePersona = async (persona: PersonaProfile) => {
    setActivePersona(persona);
    try {
      await fetch('/api/persona/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      });
    } catch (err) {
      console.error('Failed to sync active persona to server:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activePersona={activePersona}
        botStatus={botStatus}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'simulator' && (
          <DiscordSimulator activePersona={activePersona} />
        )}

        {activeTab === 'persona' && (
          <PersonaStudio activePersona={activePersona} onSavePersona={handleSavePersona} />
        )}

        {activeTab === 'setup' && (
          <DiscordBotSetup
            activePersona={activePersona}
            botStatus={botStatus}
            onRefreshStatus={fetchStatus}
          />
        )}

        {activeTab === 'logs' && <ActivityLogs />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800/80 py-4 text-center text-xs text-slate-400">
        <p>
          Discord AI Identity Bot • Powered by Gemini AI Server-side API & Discord Gateway Gateway API.
        </p>
      </footer>
    </div>
  );
}
