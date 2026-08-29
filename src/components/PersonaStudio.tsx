import React, { useState } from 'react';
import { PersonaProfile, SampleDialogue } from '../types';
import { PRESET_PERSONAS } from '../data/presets';
import { Sparkles, Plus, Trash2, Wand2, Check, RefreshCw, AlertCircle, Info, Tag, Sliders, MessageSquare } from 'lucide-react';

interface PersonaStudioProps {
  activePersona: PersonaProfile;
  onSavePersona: (persona: PersonaProfile) => void;
}

export const PersonaStudio: React.FC<PersonaStudioProps> = ({ activePersona, onSavePersona }) => {
  const [formData, setFormData] = useState<PersonaProfile>(activePersona);
  const [newTrait, setNewTrait] = useState('');
  const [newCatchphrase, setNewCatchphrase] = useState('');
  const [newMentionKeyword, setNewMentionKeyword] = useState('');
  const [newDialogueUser, setNewDialogueUser] = useState('');
  const [newDialogueBot, setNewDialogueBot] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarPromptModal, setAvatarPromptModal] = useState(false);
  const [avatarPromptText, setAvatarPromptText] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const handleSelectPreset = (preset: PersonaProfile) => {
    setFormData({ ...preset });
    onSavePersona({ ...preset });
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePersona(formData);
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 2500);
  };

  const handleAddTrait = () => {
    if (newTrait.trim() && !formData.traits.includes(newTrait.trim())) {
      setFormData({ ...formData, traits: [...formData.traits, newTrait.trim()] });
      setNewTrait('');
    }
  };

  const handleRemoveTrait = (index: number) => {
    setFormData({ ...formData, traits: formData.traits.filter((_, i) => i !== index) });
  };

  const handleAddCatchphrase = () => {
    if (newCatchphrase.trim() && !formData.customCatchphrases.includes(newCatchphrase.trim())) {
      setFormData({
        ...formData,
        customCatchphrases: [...formData.customCatchphrases, newCatchphrase.trim()],
      });
      setNewCatchphrase('');
    }
  };

  const handleRemoveCatchphrase = (index: number) => {
    setFormData({
      ...formData,
      customCatchphrases: formData.customCatchphrases.filter((_, i) => i !== index),
    });
  };

  const handleAddMentionKeyword = () => {
    let kw = newMentionKeyword.trim();
    if (kw) {
      if (!kw.startsWith('@')) kw = '@' + kw;
      if (!formData.mentionKeywords.includes(kw)) {
        setFormData({ ...formData, mentionKeywords: [...formData.mentionKeywords, kw] });
        setNewMentionKeyword('');
      }
    }
  };

  const handleRemoveMentionKeyword = (index: number) => {
    setFormData({
      ...formData,
      mentionKeywords: formData.mentionKeywords.filter((_, i) => i !== index),
    });
  };

  const handleAddSampleDialogue = () => {
    if (newDialogueUser.trim() && newDialogueBot.trim()) {
      setFormData({
        ...formData,
        sampleDialogues: [
          ...formData.sampleDialogues,
          { userPrompt: newDialogueUser.trim(), botReply: newDialogueBot.trim() },
        ],
      });
      setNewDialogueUser('');
      setNewDialogueBot('');
    }
  };

  const handleRemoveSampleDialogue = (index: number) => {
    setFormData({
      ...formData,
      sampleDialogues: formData.sampleDialogues.filter((_, i) => i !== index),
    });
  };

  const handleGenerateAIAvatar = async () => {
    const prompt = avatarPromptText.trim() || formData.name || 'cool character avatar';
    setIsGeneratingAvatar(true);
    try {
      const res = await fetch('/api/persona/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setFormData({ ...formData, avatarUrl: data.imageUrl });
        setAvatarPromptModal(false);
      } else {
        alert(data.error || 'Failed to generate avatar image.');
      }
    } catch (err: any) {
      alert('Error generating avatar: ' + err.message);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Save Toast Notice */}
      {saveSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-emerald-400 animate-bounce">
          <Check className="w-5 h-5" />
          <span className="font-semibold text-sm">Persona identity updated & active!</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Identity Persona Configurator</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Design Bot Personality
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Customize who your AI bot imitates. Define its tone, catchphrases, traits, knowledge, and mention rules.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 text-sm"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Persona</span>
            </button>
          </div>
        </div>

        {/* Quick Preset Selector Carousel */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" /> Choose Preset Identity Template:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {PRESET_PERSONAS.map((preset) => {
              const isSelected = formData.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src={preset.avatarUrl}
                      alt={preset.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{preset.tagline}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-1 text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active Profile
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Identity & Avatar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
            <Tag className="w-5 h-5 text-indigo-400" /> Basic Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar Preview & Generation */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-4">
              <div className="relative group">
                <img
                  src={formData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'}
                  alt={formData.name}
                  className="w-28 h-28 rounded-full object-cover border-2 border-indigo-500 shadow-xl"
                />
              </div>

              <div className="w-full space-y-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPromptText(formData.name + ' avatar portrait');
                    setAvatarPromptModal(true);
                  }}
                  className="w-full py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate Avatar with AI</span>
                </button>
                <p className="text-[11px] text-slate-400">Or paste direct image URL below</p>
              </div>
            </div>

            {/* Fields */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bot Character Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Gordon Ramsay, Sherlock Holmes, My Friend Alex"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tagline / Role Summary
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Fiery Michelin Star Chef"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reaction Constraints & Mention Keywords */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" /> Mention Rules & Triggers
            </h3>
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-full inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Critical Requirement Constraint
            </span>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start space-x-4">
            <input
              type="checkbox"
              id="onlyReactWhenMentioned"
              checked={formData.onlyReactWhenMentioned}
              onChange={(e) => setFormData({ ...formData, onlyReactWhenMentioned: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="onlyReactWhenMentioned" className="cursor-pointer">
              <span className="block text-sm font-bold text-white">
                Only React When Mentioned (Strict Mode)
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                When enabled, the AI bot stays completely silent unless tagged with <span className="text-indigo-400 font-mono font-semibold">@{formData.name || 'Bot'}</span>, mentioned in a message reply, or invoked with custom alias keywords. Untagged messages will be ignored.
              </span>
            </label>
          </div>

          {/* Custom Mention Keywords */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Additional Mention Trigger Keywords & Aliases
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Words or aliases that count as mentioning this bot (e.g., <span className="text-indigo-400 font-mono">@gordon</span>, <span className="text-indigo-400 font-mono">@chef</span>):
            </p>

            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                value={newMentionKeyword}
                onChange={(e) => setNewMentionKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMentionKeyword())}
                placeholder="e.g. @chef or chef"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddMentionKeyword}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition"
              >
                Add Alias
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.mentionKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMentionKeyword(i)}
                    className="hover:text-red-400 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* System Prompt & Personality Engine */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
            <Sliders className="w-5 h-5 text-indigo-400" /> AI System Instructions & Tuning
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Core Persona System Prompt (System Instruction)
            </label>
            <textarea
              rows={5}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              placeholder="Describe how the bot should behave, think, and respond..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Sliders & Style */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Humor Level: <span className="text-indigo-400">{formData.humorLevel}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.humorLevel}
                onChange={(e) => setFormData({ ...formData, humorLevel: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Serious</span>
                <span>Witty</span>
                <span>Satirical</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Formality Level: <span className="text-indigo-400">{formData.formalityLevel}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.formalityLevel}
                onChange={(e) => setFormData({ ...formData, formalityLevel: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Casual Slang</span>
                <span>Standard</span>
                <span>Aristocratic</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Reply Style
              </label>
              <select
                value={formData.replyStyle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    replyStyle: e.target.value as 'concise' | 'balanced' | 'expressive',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="concise">Concise (1-2 Sentences)</option>
                <option value="balanced">Balanced Expressive (2-4 Sentences • Recommended)</option>
                <option value="expressive">Detailed & Dramatic (3-5 Sentences)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  AI Model Engine
                </label>
                <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-full text-[10px] font-bold tracking-wide">
                  ✓ AUTO FALLBACK ACTIVE
                </span>
              </div>
              <select
                value={formData.model || 'gemini-3.7-flash'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    model: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini-3.7-flash">Gemini 3.7 Flash (Primary • Best Intelligence & Speed)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Primary • Ultra Fast & Light)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest (Primary • Auto-Updated)</option>
              </select>
              <p className="text-[11px] text-emerald-400/90 mt-1.5 flex items-center gap-1">
                <span>⚡ Multi-Level Gemini Fallback: If your selected model hits rate limits (429/quota), it automatically falls back seamlessly to alternative Gemini models.</span>
              </p>
            </div>
          </div>

          {/* Personality Traits & Catchphrases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Traits */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Personality Traits Tags
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTrait())}
                  placeholder="e.g. Sarcastic, Witty"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTrait}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.traits.map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 text-xs rounded-md flex items-center gap-1 border border-slate-700"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrait(i)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Catchphrases */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Custom Catchphrases & Signature Sayings
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newCatchphrase}
                  onChange={(e) => setNewCatchphrase(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCatchphrase())}
                  placeholder="e.g. IT'S RAW! or Elementary!"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCatchphrase}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.customCatchphrases.map((cp, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-indigo-900/40 text-indigo-200 text-xs rounded-md flex items-center gap-1 border border-indigo-700/50"
                  >
                    <span>"{cp}"</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCatchphrase(i)}
                      className="text-indigo-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Background Lore */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Background Knowledge & Lore
            </label>
            <textarea
              rows={3}
              value={formData.knowledgeBase}
              onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
              placeholder="Facts, history, or context this bot knows about itself and the world..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Few-Shot Sample Dialogues */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Sample Few-Shot Dialogues
          </h3>
          <p className="text-xs text-slate-400">
            Provide example interactions so Gemini learns the exact voice tone and response style:
          </p>

          <div className="space-y-4">
            {formData.sampleDialogues.map((sd, i) => (
              <div key={i} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl relative group">
                <button
                  type="button"
                  onClick={() => handleRemoveSampleDialogue(i)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-xs font-bold text-slate-300 mb-1">User: <span className="font-normal text-slate-100">{sd.userPrompt}</span></p>
                <p className="text-xs font-bold text-indigo-400">Bot ({formData.name}): <span className="font-normal text-slate-200">{sd.botReply}</span></p>
              </div>
            ))}

            {/* Add New Dialogue */}
            <div className="p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-3">
              <input
                type="text"
                value={newDialogueUser}
                onChange={(e) => setNewDialogueUser(e.target.value)}
                placeholder="User prompt e.g., 'How do I cook a good steak?'"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newDialogueBot}
                onChange={(e) => setNewDialogueBot(e.target.value)}
                placeholder={`Bot response as ${formData.name || 'Bot'}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSampleDialogue}
                className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Example Pair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/30 transition flex items-center space-x-2 text-sm"
          >
            <Check className="w-5 h-5" />
            <span>Apply & Save Persona Profile</span>
          </button>
        </div>
      </form>

      {/* Avatar AI Modal */}
      {avatarPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" /> AI Avatar Generator
              </h3>
              <button
                onClick={() => setAvatarPromptModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generate a custom 1:1 Discord avatar illustration using Gemini AI:
            </p>

            <textarea
              rows={3}
              value={avatarPromptText}
              onChange={(e) => setAvatarPromptText(e.target.value)}
              placeholder="Describe the portrait style, expression, background, accessories..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setAvatarPromptModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAIAvatar}
                disabled={isGeneratingAvatar}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center space-x-2 disabled:opacity-50"
              >
                {isGeneratingAvatar ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Avatar...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Avatar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
