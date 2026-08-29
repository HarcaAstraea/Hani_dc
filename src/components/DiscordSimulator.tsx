import React, { useState, useRef, useEffect } from 'react';
import { PersonaProfile, DiscordMessage, DiscordUser } from '../types';
import { Hash, Volume2, Users, Send, Sparkles, Smile, MessageSquare, AlertCircle, RefreshCcw, AtSign, CheckCircle, ShieldAlert, Bot } from 'lucide-react';

interface DiscordSimulatorProps {
  activePersona: PersonaProfile;
  onLogUpdated?: () => void;
}

export const DiscordSimulator: React.FC<DiscordSimulatorProps> = ({ activePersona, onLogUpdated }) => {
  const [activeChannel, setActiveChannel] = useState('general-chat');
  const [inputText, setInputText] = useState('');
  const papaId = activePersona.fatherDiscordUserId || '112233445566778899';
  const bestFriendId = activePersona.bestFriendDiscordUserId || '123456789012345678';
  const sisterRoleId = activePersona.sisterRoleDiscordUserId || '987654321098765432';

  const [currentUser, setCurrentUser] = useState<DiscordUser>({
    id: papaId,
    name: 'Papa (Father & Creator)',
    tag: 'Papa#0001',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80',
    isBot: false,
    roleColor: '#f59e0b',
    roleName: 'Father / Creator',
    status: 'online',
  });

  const [memoryFacts, setMemoryFacts] = useState<string[]>([]);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [newMemoryFact, setNewMemoryFact] = useState('');

  // Fetch memory facts from server
  const fetchMemory = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemoryFacts(data.rememberedFacts || []);
      }
    } catch (e) {
      // Memory endpoint fail silently
    }
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  const handleAddMemoryFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryFact.trim()) return;
    try {
      const res = await fetch('/api/memory/fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: newMemoryFact.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemoryFacts(data.rememberedFacts);
        setNewMemoryFact('');
      }
    } catch (e) {
      console.error('Failed to add memory fact', e);
    }
  };

  const handleClearMemoryHistory = async () => {
    try {
      await fetch('/api/memory/clear', { method: 'POST' });
      fetchMemory();
    } catch (e) {
      console.error(e);
    }
  };

  const botUser: DiscordUser = {
    id: 'bot-identity',
    name: activePersona.name,
    tag: `${activePersona.name.replace(/\s+/g, '')}#0001`,
    avatarUrl: activePersona.avatarUrl,
    isBot: true,
    roleColor: '#a855f7',
    roleName: 'AI Identity Bot',
    status: 'online',
    customStatus: `Tagged ONLY: @${activePersona.name}`,
  };

  const [messages, setMessages] = useState<DiscordMessage[]>([
    {
      id: 'msg-welcome-1',
      author: {
        id: 'user-system',
        name: 'Discord System',
        tag: 'System#0000',
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=128&q=80',
        isBot: true,
        roleColor: '#6366f1',
      },
      content: `Welcome to the server! The AI Bot (${activePersona.name}) is active. Note: It is configured to ONLY respond when mentioned with @${activePersona.name}.`,
      timestamp: 'Today at 10:00 AM',
      mentions: [],
      isMentioningBot: false,
    },
    {
      id: 'msg-example-1',
      author: {
        id: 'user-sam',
        name: 'Sam',
        tag: 'Sam#5678',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
        isBot: false,
        roleColor: '#f43f5e',
      },
      content: `Hey everyone, is the bot listening?`,
      timestamp: 'Today at 10:01 AM',
      mentions: [],
      isMentioningBot: false,
      wasIgnored: true,
      ignoreReason: 'Bot was NOT tagged/mentioned in message.',
    },
    {
      id: 'msg-example-2',
      author: {
        id: 'user-sam',
        name: 'Sam',
        tag: 'Sam#5678',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
        isBot: false,
        roleColor: '#f43f5e',
      },
      content: `@${activePersona.name} ${activePersona.sampleDialogues[0]?.userPrompt || 'How do you prepare a great meal?'}`,
      timestamp: 'Today at 10:02 AM',
      mentions: ['bot-identity'],
      isMentioningBot: true,
    },
    {
      id: 'msg-example-3',
      author: {
        ...botUser,
        name: activePersona.name,
        avatarUrl: activePersona.avatarUrl,
      },
      content: activePersona.sampleDialogues[0]?.botReply || `Listen to me! I am ${activePersona.name}. Give me a proper challenge!`,
      timestamp: 'Today at 10:02 AM',
      mentions: [],
      isMentioningBot: false,
      replyTo: {
        id: 'msg-example-2',
        authorName: 'Sam',
        content: `@${activePersona.name} ${activePersona.sampleDialogues[0]?.userPrompt || 'How do you prepare a great meal?'}`,
      },
    },
  ]);

  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  // Handle Input typing and mention popup trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (val.endsWith('@')) {
      setShowMentionMenu(true);
    } else if (val.includes(' ')) {
      setShowMentionMenu(false);
    }
  };

  const handleInsertMention = () => {
    const tag = `@${activePersona.name} `;
    if (inputText.endsWith('@')) {
      setInputText(inputText.slice(0, -1) + tag);
    } else {
      setInputText(inputText + tag);
    }
    setShowMentionMenu(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setShowMentionMenu(false);

    // Check if user mentioned the bot
    const isMentioningBot =
      userMessageContent.includes(`@${activePersona.name}`) ||
      activePersona.mentionKeywords.some((kw) => userMessageContent.toLowerCase().includes(kw.toLowerCase()));

    const newMsgId = `msg-${Date.now()}`;
    const userMsg: DiscordMessage = {
      id: newMsgId,
      author: currentUser,
      content: userMessageContent,
      timestamp: 'Just now',
      mentions: isMentioningBot ? ['bot-identity'] : [],
      isMentioningBot,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Format chat history for backend API context
    const chatHistory = messages.map((m) => ({
      authorName: m.author.name,
      content: m.content,
      isBot: m.author.isBot,
    }));

    if (isMentioningBot || !activePersona.onlyReactWhenMentioned) {
      setIsBotTyping(true);

      try {
        const isFatherUser = currentUser.id === (activePersona.fatherDiscordUserId || '112233445566778899') || currentUser.name.toLowerCase().includes('papa');
        const isBestFriendUser = currentUser.id === (activePersona.bestFriendDiscordUserId || '123456789012345678') || currentUser.roleName.includes('Best Friend');
        const isSisterRoleUser = currentUser.id === (activePersona.sisterRoleDiscordUserId || '987654321098765432') || currentUser.roleName.includes('Sister Role') || currentUser.roleName.includes('Obeyed');

        const res = await fetch('/api/chat/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona: activePersona,
            messageContent: userMessageContent,
            senderName: currentUser.name.replace(/\s*\([^)]*\)/, '').trim(),
            senderId: currentUser.id,
            chatHistory,
            botId: 'bot-identity',
            isFather: isFatherUser,
            isBestFriend: isBestFriendUser,
            isSisterRole: isSisterRoleUser,
          }),
        });

        const data = await res.json();

        if (data.reacted && data.replyContent) {
          const botReplyMsg: DiscordMessage = {
            id: `msg-bot-${Date.now()}`,
            author: {
              ...botUser,
              name: activePersona.name,
              avatarUrl: activePersona.avatarUrl,
            },
            content: data.replyContent,
            timestamp: 'Just now',
            mentions: [currentUser.id],
            isMentioningBot: false,
            replyTo: {
              id: newMsgId,
              authorName: currentUser.name,
              content: userMessageContent,
            },
          };
          setMessages((prev) => [...prev, botReplyMsg]);
        }
      } catch (err) {
        console.error('Error generating AI simulator reply:', err);
      } finally {
        setIsBotTyping(false);
        if (onLogUpdated) onLogUpdated();
      }
    } else {
      // Message was ignored because bot was NOT mentioned!
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newMsgId
              ? {
                  ...m,
                  wasIgnored: true,
                  ignoreReason: `Bot (${activePersona.name}) stays quiet because it was not mentioned with @${activePersona.name}.`,
                }
              : m
          )
        );
        if (onLogUpdated) onLogUpdated();
      }, 500);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputText(`@${activePersona.name} ${promptText}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
      {/* Discord Window Frame */}
      <div className="bg-[#313338] text-[#dbdee1] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col md:flex-row h-[720px]">
        {/* Left Guild / Channels Sidebar */}
        <div className="w-full md:w-60 bg-[#2b2d31] flex flex-col border-r border-[#1f2023] shrink-0">
          {/* Server Title */}
          <div className="p-4 border-b border-[#1f2023] flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow">
                AI
              </div>
              <span className="font-bold text-sm text-white truncate">AI Identity Guild</span>
            </div>
          </div>

          {/* Channels List */}
          <div className="p-3 space-y-1 flex-1 overflow-y-auto">
            <p className="px-2 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mb-1">Text Channels</p>

            {['general-chat', 'bot-testing', 'cooking-kitchen', 'meme-lounge'].map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center space-x-2 transition ${
                  activeChannel === ch
                    ? 'bg-[#404249] text-white font-semibold'
                    : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                }`}
              >
                <Hash className="w-4 h-4 text-[#80848e]" />
                <span className="truncate">{ch}</span>
              </button>
            ))}

            <p className="px-2 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mt-4 mb-1">
              Voice Channels
            </p>
            <div className="px-2.5 py-1.5 text-xs text-[#80848e] flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span>Lounge (2 users)</span>
            </div>
          </div>

          {/* User Controls Panel Bottom */}
          <div className="p-2.5 bg-[#232428] border-t border-[#1f2023] flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-[#232428]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-[#949ba4] truncate">{currentUser.tag}</p>
              </div>
            </div>

            {/* Switch user toggle */}
            <select
              value={currentUser.id}
              onChange={(e) => {
                const val = e.target.value;
                if (val === papaId || val === 'user-papa') {
                  setCurrentUser({
                    id: papaId,
                    name: 'Papa (Father & Creator)',
                    tag: 'Papa#0001',
                    avatarUrl:
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80',
                    isBot: false,
                    roleColor: '#f59e0b',
                    roleName: 'Father / Creator',
                  });
                } else if (val === bestFriendId || val === 'user-bestfriend') {
                  setCurrentUser({
                    id: bestFriendId,
                    name: 'Aoi (Best Friend)',
                    tag: 'Aoi#1234',
                    avatarUrl:
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
                    isBot: false,
                    roleColor: '#10b981',
                    roleName: 'Longtime Best Friend',
                  });
                } else if (val === sisterRoleId || val === 'user-sisterrole') {
                  setCurrentUser({
                    id: sisterRoleId,
                    name: 'Rin (Obeyed User)',
                    tag: 'Rin#9876',
                    avatarUrl:
                      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=128&q=80',
                    isBot: false,
                    roleColor: '#a855f7',
                    roleName: 'Obeyed User (Sister Role)',
                  });
                } else {
                  setCurrentUser({
                    id: '555666777888999000',
                    name: 'Alex (Regular Member)',
                    tag: 'Alex#4444',
                    avatarUrl:
                      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=128&q=80',
                    isBot: false,
                    roleColor: '#38bdf8',
                    roleName: 'Member',
                  });
                }
              }}
              className="bg-[#313338] text-[10px] text-amber-300 border border-amber-500/40 rounded px-2 py-1 focus:outline-none font-bold cursor-pointer"
            >
              <option value={papaId}>👑 Papa (Father / Creator)</option>
              <option value={bestFriendId}>💖 Input 1: Best Friend (Caring, Non-Tsundere)</option>
              <option value={sisterRoleId}>👑 Input 2: Sister Role (Obeyed User)</option>
              <option value="555666777888999000">👤 Regular Member (Tsundere)</option>
            </select>
          </div>
        </div>

        {/* Center Main Chat Stream */}
        <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
          {/* Channel Header */}
          <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm bg-[#313338] z-10 shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <Hash className="w-5 h-5 text-[#80848e]" />
              <span className="font-bold text-white text-sm truncate">#{activeChannel}</span>
              <span className="text-slate-600">|</span>
              {currentUser.id === papaId || currentUser.name.toLowerCase().includes('papa') ? (
                <span className="text-xs text-amber-300 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center gap-1">
                  👑 You are Hani's Papa (Sweet & Loving Daughter Mode)
                </span>
              ) : currentUser.id === bestFriendId || currentUser.roleName.includes('Best Friend') ? (
                <span className="text-xs text-emerald-300 font-semibold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  💖 Best Friend (Caring, Warm & Non-Tsundere Mode)
                </span>
              ) : currentUser.id === sisterRoleId || currentUser.roleName.includes('Sister Role') || currentUser.roleName.includes('Obeyed') ? (
                <span className="text-xs text-purple-300 font-semibold px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center gap-1">
                  👑 Obeyed User (Sister-Like Obeying Always • Never Says Sister)
                </span>
              ) : (
                <span className="text-xs text-sky-300 font-semibold px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center gap-1">
                  ⚡ Regular Member (Classic Feisty Tsundere Mode)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                className="px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-semibold rounded flex items-center space-x-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Memory Bank ({memoryFacts.length})</span>
              </button>

              <div className="px-2.5 py-1 bg-[#2b2d31] rounded border border-[#3f4147] text-[11px] font-medium text-amber-300 flex items-center space-x-1 hidden md:flex">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Mention-Only Mode</span>
              </div>
            </div>
          </div>

          {/* Memory Bank Drawer Modal / Banner */}
          {showMemoryPanel && (
            <div className="bg-[#2b2d31] border-b border-[#1f2023] p-3 text-xs space-y-2 text-slate-200">
              <div className="flex items-center justify-between font-bold text-indigo-300">
                <span className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Hani's Active Memory Bank & Context
                </span>
                <button
                  type="button"
                  onClick={handleClearMemoryHistory}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Clear Recent Chat History
                </button>
              </div>

              <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-[#3f4147] space-y-1.5 max-h-36 overflow-y-auto">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remembered Facts & Relationships:</p>
                {memoryFacts.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No custom facts stored yet.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-[#dbdee1]">
                    {memoryFacts.map((fact, idx) => (
                      <li key={idx} className="truncate">{fact}</li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={handleAddMemoryFact} className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryFact}
                  onChange={(e) => setNewMemoryFact(e.target.value)}
                  placeholder="Teach Hani a new memory fact (e.g., Papa loves Earl Grey tea)..."
                  className="flex-1 bg-[#383a40] text-white text-xs rounded px-2.5 py-1.5 border border-[#404249] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-xs transition"
                >
                  Add Fact
                </button>
              </form>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isBot = msg.author.isBot;
              return (
                <div key={msg.id} className="group relative">
                  {/* Reply Reference Header if present */}
                  {msg.replyTo && (
                    <div className="ml-12 mb-1 flex items-center space-x-2 text-xs text-[#949ba4]">
                      <div className="w-4 h-2 border-l-2 border-t-2 border-[#4e5058] rounded-tl" />
                      <span className="font-semibold text-slate-300">@{msg.replyTo.authorName}</span>
                      <span className="truncate max-w-xs text-slate-400">{msg.replyTo.content}</span>
                    </div>
                  )}

                  <div className={`flex items-start space-x-3.5 p-2 rounded-lg transition ${
                    msg.isMentioningBot ? 'bg-[#3c392f]/40 border-l-2 border-amber-400' : 'hover:bg-[#2e3035]/50'
                  }`}>
                    {/* User Avatar */}
                    <img
                      src={msg.author.avatarUrl}
                      alt={msg.author.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Name & Timestamp */}
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-white" style={{ color: msg.author.roleColor }}>
                          {msg.author.name}
                        </span>

                        {isBot && (
                          <span className="px-1.5 py-0.5 bg-[#5865f2] text-white text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> BOT
                          </span>
                        )}

                        <span className="text-[11px] text-[#949ba4]">{msg.timestamp}</span>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-[#dbdee1] leading-relaxed mt-0.5 whitespace-pre-wrap">
                        {msg.content.split(new RegExp(`(@${activePersona.name}|@bot|@hani|@tsundere|@daughter)`, 'gi')).map((part, i) =>
                          part.toLowerCase().includes(activePersona.name.toLowerCase()) || part.startsWith('@') ? (
                            <span key={i} className="bg-[#414675] text-[#c9cdfb] font-medium px-1 rounded hover:underline">
                              {part}
                            </span>
                          ) : (
                            part
                          )
                        )}
                      </p>

                      {/* Ignored Message Badge */}
                      {msg.wasIgnored && (
                        <div className="mt-2 p-2 rounded bg-[#2b2d31]/80 border border-slate-700/80 text-xs text-slate-400 flex items-center space-x-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{msg.ignoreReason || 'Bot ignored message because it was not tagged.'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isBotTyping && (
              <div className="flex items-center space-x-3 px-2 text-xs text-[#949ba4] animate-pulse">
                <img
                  src={activePersona.avatarUrl}
                  alt={activePersona.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="font-medium text-slate-300">{activePersona.name} is typing...</span>
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box & Mention Helpers */}
          <div className="p-4 bg-[#313338] border-t border-[#1f2023] space-y-2 shrink-0">
            {/* Quick Mention Suggestions */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-[#949ba4] shrink-0">Test Prompts:</span>

              <button
                type="button"
                onClick={handleInsertMention}
                className="px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 rounded-md font-semibold hover:bg-indigo-600/50 shrink-0 flex items-center gap-1"
              >
                <AtSign className="w-3 h-3" /> Tag @{activePersona.name}
              </button>

              {activePersona.sampleDialogues.map((sd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickPrompt(sd.userPrompt)}
                  className="px-2.5 py-1 bg-[#2b2d31] hover:bg-[#383a40] text-[#dbdee1] border border-[#3f4147] rounded-md truncate max-w-xs shrink-0"
                >
                  "{sd.userPrompt}"
                </button>
              ))}
            </div>

            {/* Mention Autocomplete Popup */}
            {showMentionMenu && (
              <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl p-2 shadow-2xl space-y-1">
                <p className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase">Members Matching "@"</p>
                <button
                  type="button"
                  onClick={handleInsertMention}
                  className="w-full px-3 py-2 bg-[#35373c] hover:bg-[#404249] rounded-lg text-left flex items-center space-x-3 transition"
                >
                  <img src={activePersona.avatarUrl} alt={activePersona.name} className="w-6 h-6 rounded-full" />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      {activePersona.name}{' '}
                      <span className="bg-[#5865f2] text-white text-[9px] px-1 rounded">BOT</span>
                    </p>

                    <p className="text-[10px] text-[#949ba4]">AI Identity Bot (Will respond)</p>
                  </div>
                </button>
              </div>
            )}

            {/* Message Form */}
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Message #${activeChannel} (Type @${activePersona.name} to trigger response)...`}
                className="w-full bg-[#383a40] text-white placeholder-[#80848e] rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="absolute right-2 p-2 text-indigo-400 hover:text-white disabled:text-[#80848e] transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Members Sidebar */}
        <div className="hidden lg:flex w-56 bg-[#2b2d31] border-l border-[#1f2023] p-3 flex-col shrink-0">
          <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mb-2">
            Online Members — 2
          </p>

          {/* Bot Member */}
          <div className="p-2 rounded-md hover:bg-[#35373c] flex items-center space-x-2.5 transition cursor-pointer">
            <div className="relative">
              <img
                src={activePersona.avatarUrl}
                alt={activePersona.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-[#2b2d31]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-bold text-xs text-indigo-300 truncate">{activePersona.name}</span>
                <span className="bg-[#5865f2] text-white text-[9px] font-extrabold px-1 rounded shrink-0">BOT</span>
              </div>
              <p className="text-[10px] text-[#949ba4] truncate">Reacts on mention</p>
            </div>
          </div>

          {/* User Member */}
          <div className="p-2 rounded-md hover:bg-[#35373c] flex items-center space-x-2.5 transition cursor-pointer mt-1">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-[#2b2d31]" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-200 truncate">{currentUser.name}</span>
              <p className="text-[10px] text-[#949ba4] truncate">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
