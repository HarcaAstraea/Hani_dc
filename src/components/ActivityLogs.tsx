import React, { useState, useEffect } from 'react';
import { BotActivityLog } from '../types';
import { FileText, RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle, Sparkles, Filter, Clock } from 'lucide-react';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<BotActivityLog[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'mentions') return log.eventType === 'mention_received' || log.eventType === 'bot_replied';
    if (filterType === 'ignored') return log.eventType === 'ignored_no_mention';
    if (filterType === 'errors') return log.eventType === 'system_error';
    return true;
  });

  const getEventBadge = (type: BotActivityLog['eventType']) => {
    switch (type) {
      case 'bot_replied':
        return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full">Replied</span>;
      case 'mention_received':
        return <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-full">Mentioned</span>;
      case 'ignored_no_mention':
        return <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold rounded-full">Ignored (No Mention)</span>;
      case 'discord_gateway_event':
        return <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold rounded-full">Gateway Event</span>;
      case 'system_error':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold rounded-full">Error</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full">Log</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Bot Event & Trigger Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry showing mention detection, Gemini AI invocation, response latency, and ignored messages.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilterType('mentions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'mentions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mentions & Replies
            </button>
            <button
              onClick={() => setFilterType('ignored')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'ignored' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ignored
            </button>
            <button
              onClick={() => setFilterType('errors')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'errors' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Errors
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">No activity logs recorded yet.</p>
            <p className="text-xs">Send a message or mention the bot in the Discord Simulator to see live logs here!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 font-mono text-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-850 transition space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getEventBadge(log.eventType)}
                    <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-indigo-300 font-semibold">{log.channelName}</span>
                    <span className="text-slate-500">by</span>
                    <span className="text-slate-200 font-semibold">{log.authorName}</span>
                  </div>

                  {log.latencyMs !== undefined && (
                    <span className="text-[11px] text-emerald-400 font-sans font-medium bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                      ⚡ {log.latencyMs}ms
                    </span>
                  )}
                </div>

                {log.userPrompt && (
                  <p className="text-slate-300 font-sans text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 font-mono text-[11px] block mb-0.5">Prompt:</span>
                    {log.userPrompt}
                  </p>
                )}

                {log.botReply && (
                  <p className="text-indigo-200 font-sans text-xs bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-500/30">
                    <span className="text-indigo-400 font-mono text-[11px] block mb-0.5">Bot AI Output:</span>
                    {log.botReply}
                  </p>
                )}

                {log.details && (
                  <p className="text-slate-400 text-[11px] font-sans">
                    <span className="text-slate-500 font-semibold">Info:</span> {log.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
