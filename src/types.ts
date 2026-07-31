export interface SampleDialogue {
  userPrompt: string;
  botReply: string;
}

export interface PersonaProfile {
  id: string;
  name: string;
  tagline: string;
  avatarUrl: string;
  systemPrompt: string;
  traits: string[];
  humorLevel: number; // 1 to 10
  formalityLevel: number; // 1 to 10
  replyStyle: 'concise' | 'balanced' | 'expressive';
  customCatchphrases: string[];
  knowledgeBase: string;
  sampleDialogues: SampleDialogue[];
  mentionKeywords: string[];
  onlyReactWhenMentioned: boolean;
  typingSpeedMs: number;
  model: string;
}

export interface DiscordUser {
  id: string;
  name: string;
  tag: string;
  avatarUrl: string;
  isBot: boolean;
  roleColor?: string;
  roleName?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
}

export interface DiscordMessage {
  id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  mentions: string[]; // array of user/bot IDs mentioned
  isMentioningBot: boolean;
  replyTo?: {
    id: string;
    authorName: string;
    content: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji -> array of user IDs
  wasIgnored?: boolean;
  ignoreReason?: string;
  isBotTyping?: boolean;
}

export interface BotActivityLog {
  id: string;
  timestamp: string;
  eventType: 'mention_received' | 'gemini_generating' | 'bot_replied' | 'ignored_no_mention' | 'discord_gateway_event' | 'system_error';
  channelName: string;
  authorName: string;
  userPrompt: string;
  botReply?: string;
  latencyMs?: number;
  details?: string;
}

export interface DiscordBotStatus {
  isConnected: boolean;
  botUser: {
    username: string;
    id: string;
    avatar: string;
    discriminator?: string;
  } | null;
  guildCount: number;
  uptimeSeconds: number;
  lastEventTime: string | null;
  lastError: string | null;
}
