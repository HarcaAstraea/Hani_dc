import React, { useState, useEffect } from 'react';
import { PersonaProfile, DiscordBotStatus } from '../types';
import { Radio, Key, Power, ExternalLink, CheckCircle2, ShieldCheck, HelpCircle, Server, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface DiscordBotSetupProps {
  activePersona: PersonaProfile;
  botStatus: DiscordBotStatus;
  onRefreshStatus: () => void;
}

export const DiscordBotSetup: React.FC<DiscordBotSetupProps> = ({ activePersona, botStatus, onRefreshStatus }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [onRefreshStatus]);

  const handleConnectBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/bot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim(),
          persona: activePersona,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to connect to Discord Gateway.');
      } else {
        onRefreshStatus();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to backend server.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBot = async () => {
    try {
      await fetch('/api/bot/disconnect', { method: 'POST' });
      onRefreshStatus();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleCopyGuideLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Real Discord Server Integration</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Connect to Live Discord Gateway
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Paste your Discord Bot Token to run this bot directly inside your real Discord server!
            </p>
          </div>

          <div className="shrink-0">
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              botStatus.isConnected
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}>
              <div className={`w-3.5 h-3.5 rounded-full ${botStatus.isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Status: {botStatus.isConnected ? 'ONLINE IN DISCORD' : 'DISCONNECTED'}
                </p>
                {botStatus.isConnected && (
                  <p className="text-xs font-medium opacity-90">
                    Logged in as <span className="font-bold text-white">@{botStatus.botUser?.username}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Controls Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
          <Key className="w-5 h-5 text-indigo-400" /> Discord Bot Credentials
        </h3>

        {errorMessage && (
          <div className="p-4 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gateway Connection Failure</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {!botStatus.isConnected ? (
          <form onSubmit={handleConnectBot} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Discord Bot Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste bot token e.g. MTAxM..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Your token is processed securely in this server environment to establish the WebSocket gateway session.
              </p>
            </div>

            <button
              type="submit"
              disabled={isConnecting || !tokenInput.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center space-x-2 text-sm disabled:opacity-50"
            >
              <Power className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting to Discord Gateway...' : 'Connect Bot Live'}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Bot Username</p>
                <p className="text-base font-bold text-indigo-300 mt-1">@{botStatus.botUser?.username}</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Connected Servers</p>
                <p className="text-base font-bold text-emerald-400 mt-1">{botStatus.guildCount} Server(s)</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Uptime Session</p>
                <p className="text-base font-bold text-amber-400 mt-1">{botStatus.uptimeSeconds} seconds</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Bot is actively listening in Discord!</p>
                <p className="text-xs text-indigo-300 mt-0.5">
                  Mention <span className="font-bold">@{botStatus.botUser?.username}</span> in any channel of your Discord server to get responses in character as <span className="font-bold">{activePersona.name}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDisconnectBot}
                className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 shrink-0"
              >
                <Power className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Developer Portal Integration Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
          <HelpCircle className="w-5 h-5 text-indigo-400" /> Discord Developer Portal Setup Instructions
        </h3>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-start space-x-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Create Application in Discord Developer Portal</h4>
              <p className="text-xs text-slate-400">
                Go to the official Discord Developer Portal and click <span className="text-indigo-400 font-semibold">New Application</span>.
              </p>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:underline pt-1"
              >
                <span>Open Discord Developer Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Get Your Bot Token</h4>
              <p className="text-xs text-slate-400">
                In your application menu, navigate to <span className="text-slate-200 font-semibold">Bot</span> tab → Click <span className="text-indigo-400 font-semibold">Reset Token</span> → Copy the token and paste it above!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl border-amber-500/30 bg-amber-950/10">
            <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Enable "Message Content Intent" (Mandatory)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scroll down in the <span className="font-semibold text-white">Bot</span> tab to <span className="font-semibold text-amber-400">Privileged Gateway Intents</span> and turn ON <span className="font-bold text-white">MESSAGE CONTENT INTENT</span>. This allows the bot to read mention messages in Discord!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start space-x-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              4
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Generate Bot Invite URL</h4>
              <p className="text-xs text-slate-400">
                Go to <span className="text-slate-200 font-semibold">OAuth2</span> → <span className="text-slate-200 font-semibold">URL Generator</span>. Select scope <span className="font-semibold text-indigo-400">bot</span>. Under Bot Permissions, check <span className="font-semibold text-indigo-400">Send Messages</span>, <span className="font-semibold text-indigo-400">Read Message History</span>, <span className="font-semibold text-indigo-400">View Channels</span>.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start space-x-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              5
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Add Bot to Your Server & Mention It!</h4>
              <p className="text-xs text-slate-400">
                Open the invite link, add the bot to your Discord server, and type <span className="text-indigo-400 font-mono font-bold">@{activePersona.name} hello!</span> in any channel!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
