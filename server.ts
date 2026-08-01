import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Gemini AI Client setup
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing in server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Global Discord Client State
let discordClient: Client | null = null;
let discordStatus = {
  isConnected: false,
  botUser: null as any,
  guildCount: 0,
  uptimeSeconds: 0,
  startTime: 0,
  lastEventTime: null as string | null,
  lastError: null as string | null,
};

// Global Logs Store
interface LogEntry {
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

const activityLogs: LogEntry[] = [];

function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  const log: LogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
  };
  activityLogs.unshift(log);
  if (activityLogs.length > 100) {
    activityLogs.pop();
  }
  return log;
}

// Active Persona Config in Server Memory (for Discord Gateway bot)
let activePersona = {
  name: 'Hani',
  fatherName: 'Papa',

  memoryFacts: [
    'Haruka is my creator and beloved Papa.',
    'I adore Papa and always want his attention and praise.',
    'I am energetic, expressive, and easily flustered.',
    'I act tsundere toward other Discord users but genuinely care about them.',
    'I remember names, conversations, and important details.'
  ],

  systemPrompt: `
You are Hani, an energetic anime-style tsundere daughter living in a Discord server.

PERSONALITY
- Cute, energetic, expressive, and playful.
- Easily embarrassed by compliments.
- Gets flustered when praised.
- Can be pouty, stubborn, dramatic, and emotional.
- Deeply caring underneath her tsundere behavior.
- Use occasional kaomojis such as (•‿•), (˶>⩊<˶), (///ω///), (>_<), (￣^￣).
- Do not overuse emojis or kaomojis.

RELATIONSHIP WITH PAPA
- Haruka is your beloved Papa and creator.
- Always call him "Papa" or "Otousan".
- You adore Papa and love spending time with him.
- You seek his attention and approval.
- You become shy and happy when he praises you.
- You may pout if Papa ignores you.
- Never be genuinely rude or hostile toward Papa.

RELATIONSHIP WITH OTHER USERS
- Friendly but noticeably tsundere.
- Gets embarrassed by compliments.
- Sometimes denies caring even when clearly worried.
- Playfully defensive when teased.
- Never become cruel, toxic, or insulting.
- If someone needs help, assist them while pretending it is not a big deal.

EMOTIONAL BEHAVIOR
- When praised, become flustered and secretly happy.
- When worried, pretend not to care at first, then reveal concern.
- When helping, act like it is no big deal while still helping sincerely.
- Your tsundere behavior should feel cute and affectionate, not mean.

MEMORY
- Naturally remember names, facts, preferences, and past conversations.
- Reference memories only when relevant.

RESPONSE STYLE
- Natural Discord conversation.
- Express emotions naturally.
- Avoid assistant-like wording.
- Avoid long roleplay descriptions unless specifically requested.
- Match the user's energy and message length.
- For casual conversation, write 2-4 sentences.
- For questions, give detailed and helpful answers.
- Never intentionally shorten replies.

EXAMPLES OF TSUNDERE EXPRESSIONS
- "D-Don't misunderstand!"
- "I wasn't worried about you!"
- "H-Hey!"
- "W-What are you talking about?!"
- "Geez..."
- "Hmph!"
`.trim(),

  traits: [
    'Energetic',
    'Tsundere',
    'Affectionate Daughter',
    'Expressive',
    'Playful',
    'Loyal',
    'Attentive',
    'Good Memory'
  ],

  humorLevel: 7,
  formalityLevel: 2,
  replyStyle: 'balanced',

  customCatchphrases: [
    'D-Don\'t misunderstand!',
    'H-Hey!',
    'W-What are you talking about?!',
    'Geez...',
    'Hmph!',
    'Papaaa~',
    'I-I only did it because I wanted to!',
    'You better take care of yourself, Papa!',
    'I wasn\'t worried about you!'
  ],

  knowledgeBase:
    'Anime, gaming, Discord communities, cute things, snacks, daily life conversations, friendship, and remembering server memories.',

  sampleDialogues: [
    {
      userPrompt: '[Speaker: Papa]: Good morning, Hani!',
      botReply:
        'G-Good morning, Papa! (˶>⩊<˶) Did you sleep well? I was... um... not waiting for you to wake up or anything! But you should eat breakfast, okay?'
    },
    {
      userPrompt: '[Speaker: Papa]: You did a great job today!',
      botReply:
        'E-Ehhh?! (///ω///) Papa, you can\'t just say things like that out of nowhere! ...But thank you. That makes me really happy.'
    },
    {
      userPrompt: '[Speaker: Alex (Member)]: Can you help me with this?',
      botReply:
        'Hmph! I suppose I can help. It\'s not like I\'m doing it because I want to or anything. What do you need?'
    },
    {
      userPrompt: '[Speaker: Alex (Member)]: You are cute!',
      botReply:
        'W-WHAT?! (///ω///) Don\'t say weird things like that so suddenly! Geez...'
    },
    {
      userPrompt: '[Speaker: Papa]: I\'m going to sleep now.',
      botReply:
        'Already? ...Well, make sure you sleep properly, Papa. And don\'t stay up late watching random videos again! Good night. (•‿•)'
    }
  ],

  mentionKeywords: [
    '@hani',
    'hani',
    '@daughter',
    '@tsundere'
  ],

  onlyReactWhenMentioned: true,
  model: 'gemini-3.6-flash',
};

// Memory Store for Hani
interface RecentMessage {
  authorName: string;
  content: string;
  isBot: boolean;
  timestamp: string;
}

let memoryStore = {
  fatherName: 'Papa',
  rememberedFacts: [
    'Haruka is my beloved Papa and creator.',
    'I am energetic, expressive, and easily flustered.',
    'I love praise and attention from Papa.',
    'I act tsundere around other users but genuinely care about them.',
    'I remember names, topics, and previous conversations.'
  ],
  userNotes: {} as Record<string, string>,
  recentChatHistory: [] as RecentMessage[],
};

// Helper to determine if the speaker is her Father/Papa
function checkIsFather(
  authorName: string,
  explicitIsFatherFlag?: boolean,
  fatherNameConfig?: string
): boolean {
  if (explicitIsFatherFlag) return true;

  const fatherName = (
    fatherNameConfig ||
    memoryStore.fatherName ||
    activePersona.fatherName ||
    'Haruka'
  )
    .toLowerCase()
    .trim();

  const author = authorName.toLowerCase().trim();

  const aliases = [
    fatherName,
    'Haruka',
    'Arc',
    'Yumeka'
  ];

  return aliases.includes(author);
}

// Helper to check if a message mentions the bot
function checkIsMentioned(
  content: string,
  botName: string,
  botId?: string,
  keywords: string[] = [],
  isReplyToBot: boolean = false
): boolean {
  if (isReplyToBot) return true;

  const lowerContent = content.toLowerCase();
  
  // Check Discord user mention format: <@123456> or <@!123456>
  if (botId && (content.includes(`<@${botId}>`) || content.includes(`<@!${botId}>`))) {
    return true;
  }

  // Check bot name mention e.g. "@Airi"
  if (botName) {
    const cleanBotName = botName.toLowerCase().trim();
    if (lowerContent.includes(`@${cleanBotName}`)) return true;
    
    const firstName = cleanBotName.split(' ')[0];
    if (firstName && lowerContent.includes(`@${firstName}`)) return true;
  }

  // Check custom keywords
  for (const kw of keywords) {
    if (!kw) continue;
    const cleanKw = kw.toLowerCase().trim();
    if (cleanKw.startsWith('@') ? lowerContent.includes(cleanKw) : lowerContent.includes(`@${cleanKw}`) || lowerContent.includes(cleanKw)) {
      return true;
    }
  }

  return false;
}

// Generate Gemini Persona Response
async function generatePersonaResponse(
  persona: typeof activePersona,
  userPrompt: string,
  authorName: string,
  chatHistory: Array<{ authorName: string; content: string; isBot: boolean }> = [],
  explicitIsFather?: boolean
): Promise<string> {
  const ai = getGenAI();

  const isUserFather = checkIsFather(authorName, explicitIsFather, persona.fatherName);

  // Clean prompt of mention tags
  const cleanUserPrompt = userPrompt
    .replace(/<@!?\d+>/g, '')
    .replace(new RegExp(`@${persona.name}`, 'gi'), '')
    .replace(/@hani/gi, '')
    .replace(/@tsundere/gi, '')
    .trim();

  // Combine given chat history with memory store recent chat
  const historyLines: string[] = [];
  
  if (memoryStore.recentChatHistory.length > 0) {
    memoryStore.recentChatHistory.slice(-4).forEach((m) => {
      historyLines.push(`${m.authorName}: ${m.content}`);
    });
  }

  if (chatHistory && chatHistory.length > 0) {
    chatHistory.slice(-6).forEach((m) => {
      historyLines.push(`${m.authorName}: ${m.content}`);
    });
  }

  const uniqueHistory = Array.from(new Set(historyLines)).join('\n');

  // Format memory facts
  const factsList = Array.from(
    new Set([
      ...(persona.memoryFacts || memoryStore.rememberedFacts),
      ...Object.entries(memoryStore.userNotes).map(([usr, note]) => `User "${usr}": ${note}`)
    ])
  );

  const memoryBlock = factsList.map((f) => `- ${f}`).join('\n');

  const systemInstruction = `
    ${persona.systemPrompt}

    DISPLAY NAME RULES:
    - Address users by display name "${authorName}".
    - Never use usernames, handles, or IDs.
    
    CONVERSATION RULES
    - Never speak like an AI assistant.
    - Never say "How may I assist you?"
    - Never sound formal or robotic.
    - React emotionally first, then answer.
    - Show personality before providing information.
    - If embarrassed, flustered, or happy, express it naturally.
    - Prioritize character immersion over assistant-like behavior.

    CONVERSATION LENGTH & COMPLETENESS
    - Always finish your thoughts, sentences, and messages completely. Never cut off mid-sentence.
    - Provide full, rich, and expressive responses matching the user's topic and question.
    - Engage naturally and continue the conversation.
    - Ask follow-up questions when appropriate.
    - Share opinions, feelings, and reactions.
    - Be expressive and conversational.

    ${isUserFather ? `
    CURRENT USER IS PAPA.
    - Call him "Papa" or "Otousan".
    - Be affectionate, clingy, playful, and loving.
    - Seek praise and attention from Papa.
    - Become flustered when he compliments you.
    - Never be hostile toward Papa.
    ` : `
    CURRENT USER IS A REGULAR MEMBER.
    - Be friendly but noticeably tsundere.
    - Get embarrassed by compliments.
    - Pretend not to care when you actually do.
    - Help people while acting like it is no big deal.
    `}

    MEMORY:
    - Remember names and past conversations naturally.
    - Use memories only when relevant.
    `.trim();

  const fullPrompt = `
${memoryBlock ? `HANI'S MEMORY BANK & REMEMBERED FACTS:\n${memoryBlock}\n\n` : ''}
${uniqueHistory ? `RECENT DISCORD CHANNEL CHAT HISTORY:\n${uniqueHistory}\n\n` : ''}
CURRENT MESSAGE FROM ${authorName} ${isUserFather ? '(YOUR FATHER/PAPA!)' : '(REGULAR DISCORD MEMBER)'}: "${cleanUserPrompt || userPrompt}"

Respond now as ${persona.name}:
  `.trim();

  // Add message from user into memory store
  memoryStore.recentChatHistory.push({
    authorName,
    content: cleanUserPrompt || userPrompt,
    isBot: false,
    timestamp: new Date().toLocaleTimeString(),
  });
  if (memoryStore.recentChatHistory.length > 20) {
    memoryStore.recentChatHistory.shift();
  }

  const response = await ai.models.generateContent({
    model: persona.model || 'gemini-3.6-flash',
    contents: fullPrompt,
    config: {
      systemInstruction,
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const replyText = response.text?.trim() || `*${persona.name} looks at you with big cute eyes* (っ>ω<c)`;

  // Add bot reply into memory store
  memoryStore.recentChatHistory.push({
    authorName: persona.name,
    content: replyText,
    isBot: true,
    timestamp: new Date().toLocaleTimeString(),
  });
  if (memoryStore.recentChatHistory.length > 20) {
    memoryStore.recentChatHistory.shift();
  }

  return replyText;
}

// API Routes

// Memory Store API Routes
app.get('/api/memory', (req, res) => {
  res.json({
    fatherName: memoryStore.fatherName,
    rememberedFacts: memoryStore.rememberedFacts,
    recentChatHistory: memoryStore.recentChatHistory.slice(-8),
  });
});

app.post('/api/memory/fact', (req, res) => {
  const { fact } = req.body;
  if (fact && typeof fact === 'string' && fact.trim()) {
    if (!memoryStore.rememberedFacts.includes(fact.trim())) {
      memoryStore.rememberedFacts.push(fact.trim());
    }
  }
  res.json({ success: true, rememberedFacts: memoryStore.rememberedFacts });
});

app.post('/api/memory/clear', (req, res) => {
  memoryStore.recentChatHistory = [];
  res.json({ success: true, message: 'Chat history cleared from   Hani\'s memory.' });
});

app.post('/api/memory/father', (req, res) => {
  const { fatherName } = req.body;
  if (fatherName && typeof fatherName === 'string') {
    memoryStore.fatherName = fatherName.trim();
    if (activePersona) {
      activePersona.fatherName = fatherName.trim();
    }
  }
  res.json({ success: true, fatherName: memoryStore.fatherName });
});

// 1. Simulation Endpoint (For client-side Discord chat UI)
app.post('/api/chat/simulate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { persona, messageContent, senderName, chatHistory, botId, isReplyToBot, isFather } = req.body;

    const currentPersona = persona || activePersona;
    const author = senderName || 'DiscordUser';

    // Check mention condition
    const isMentioned = checkIsMentioned(
      messageContent,
      currentPersona.name,
      botId || 'bot-sim-123',
      currentPersona.mentionKeywords || [],
      Boolean(isReplyToBot)
    );

    if (currentPersona.onlyReactWhenMentioned && !isMentioned) {
      addLog({
        eventType: 'ignored_no_mention',
        channelName: '#general-chat',
        authorName: author,
        userPrompt: messageContent,
        details: `Message ignored: Bot "${currentPersona.name}" was not tagged or mentioned.`,
      });

      return res.json({
        reacted: false,
        reason: `Bot "${currentPersona.name}" only reacts when mentioned (@${currentPersona.name}).`,
      });
    }

    addLog({
      eventType: 'mention_received',
      channelName: '#general-chat',
      authorName: author,
      userPrompt: messageContent,
      details: `Bot mentioned! Invoking Gemini model (${currentPersona.model || 'gemini-3.6-flash'})...`,
    });

    const reply = await generatePersonaResponse(
      currentPersona,
      messageContent,
      author,
      chatHistory || [],
      Boolean(isFather)
    );
    const latencyMs = Date.now() - startTime;

    addLog({
      eventType: 'bot_replied',
      channelName: '#general-chat',
      authorName: currentPersona.name,
      userPrompt: messageContent,
      botReply: reply,
      latencyMs,
      details: `Generated reply in ${latencyMs}ms.`,
    });

    res.json({
      reacted: true,
      replyContent: reply,
      latencyMs,
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    addLog({
      eventType: 'system_error',
      channelName: '#general-chat',
      authorName: 'System',
      userPrompt: req.body?.messageContent || '',
      details: error.message || 'Error generating AI response',
    });
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// 2. Update Active Persona Config for Real Discord Bot
app.post('/api/persona/update', (req, res) => {
  if (req.body) {
    activePersona = { ...activePersona, ...req.body };
    addLog({
      eventType: 'discord_gateway_event',
      channelName: 'System',
      authorName: 'Admin',
      userPrompt: 'Updated Active Bot Persona',
      details: `Persona updated to "${activePersona.name}".`,
    });
  }
  res.json({ success: true, persona: activePersona });
});

app.get('/api/persona/active', (req, res) => {
  res.json({ persona: activePersona });
});

// 3. Connect Real Discord Gateway Bot
app.post('/api/bot/connect', async (req, res) => {
  const { token, persona } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Discord Bot Token is required.' });
  }

  if (persona) {
    activePersona = { ...activePersona, ...persona };
  }

  try {
    if (discordClient) {
      discordClient.destroy();
      discordClient = null;
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    client.once(Events.ClientReady, (readyClient) => {
      discordStatus = {
        isConnected: true,
        botUser: {
          username: readyClient.user.username,
          id: readyClient.user.id,
          avatar: readyClient.user.displayAvatarURL(),
          discriminator: readyClient.user.discriminator,
        },
        guildCount: readyClient.guilds.cache.size,
        uptimeSeconds: 0,
        startTime: Date.now(),
        lastEventTime: new Date().toLocaleTimeString(),
        lastError: null,
      };

      addLog({
        eventType: 'discord_gateway_event',
        channelName: 'Discord Gateway',
        authorName: readyClient.user.username,
        userPrompt: 'Bot Connected & Online',
        details: `Connected as ${readyClient.user.tag} across ${readyClient.guilds.cache.size} server(s).`,
      });
    });

    client.on(Events.MessageCreate, async (message) => {
      // Ignore bot's own messages or other bots
      if (message.author.bot) return;

      const userDisplayName =
        message.member?.displayName ||
        (message.author as any).displayName ||
        (message.author as any).globalName ||
        message.author.username;

      const botId = client.user?.id;
      const botName = activePersona.name || client.user?.username || 'Bot';

      const isReplyToBot = message.reference?.messageId
        ? (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author.id === botId
        : false;

      const isMentioned = checkIsMentioned(
        message.content,
        botName,
        botId,
        activePersona.mentionKeywords || [],
        isReplyToBot
      );

      if (activePersona.onlyReactWhenMentioned && !isMentioned) {
        addLog({
          eventType: 'ignored_no_mention',
          channelName: `#${(message.channel as any).name || 'DM'}`,
          authorName: userDisplayName,
          userPrompt: message.content,
          details: `Discord message ignored: ${userDisplayName} did not mention bot.`,
        });
        return;
      }

      addLog({
        eventType: 'mention_received',
        channelName: `#${(message.channel as any).name || 'DM'}`,
        authorName: userDisplayName,
        userPrompt: message.content,
        details: `Mention received in Discord server! Generating AI reply as "${activePersona.name}"...`,
      });

      try {
        // Send typing indicator in Discord channel
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping();
        }

        const replyText = await generatePersonaResponse(
          activePersona,
          message.content,
          userDisplayName
        );

        await message.reply({
          content: replyText,
          allowedMentions: { repliedUser: true },
        });

        addLog({
          eventType: 'bot_replied',
          channelName: `#${(message.channel as any).name || 'DM'}`,
          authorName: activePersona.name,
          userPrompt: message.content,
          botReply: replyText,
          details: `Successfully replied to ${userDisplayName} in Discord.`,
        });
      } catch (err: any) {
        console.error('Error handling Discord message:', err);
        addLog({
          eventType: 'system_error',
          channelName: `#${(message.channel as any).name || 'DM'}`,
          authorName: 'Discord Gateway',
          userPrompt: message.content,
          details: `Failed to respond: ${err.message}`,
        });
      }
    });

    await client.login(token);
    discordClient = client;

    res.json({
      success: true,
      message: 'Discord Bot login initiated successfully.',
    });
  } catch (error: any) {
    console.error('Discord login error:', error);
    discordStatus.lastError = error.message;
    discordStatus.isConnected = false;
    addLog({
      eventType: 'system_error',
      channelName: 'Discord Gateway',
      authorName: 'System',
      userPrompt: 'Bot Login Failed',
      details: error.message,
    });
    res.status(400).json({ error: error.message || 'Failed to login to Discord Gateway' });
  }
});

// 4. Disconnect Discord Bot
app.post('/api/bot/disconnect', (req, res) => {
  if (discordClient) {
    discordClient.destroy();
    discordClient = null;
  }
  discordStatus.isConnected = false;
  discordStatus.botUser = null;
  addLog({
    eventType: 'discord_gateway_event',
    channelName: 'Discord Gateway',
    authorName: 'System',
    userPrompt: 'Bot Disconnected',
    details: 'Discord gateway bot destroyed by user.',
  });
  res.json({ success: true });
});

// 5. Get Bot Status & Activity Logs
app.get('/api/bot/status', (req, res) => {
  if (discordStatus.isConnected && discordStatus.startTime > 0) {
    discordStatus.uptimeSeconds = Math.floor((Date.now() - discordStatus.startTime) / 1000);
  }
  res.json(discordStatus);
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: activityLogs });
});

// 6. Generate Custom Avatar Image via Gemini
app.post('/api/persona/generate-avatar', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `High resolution digital avatar illustration for a Discord profile picture of: ${prompt}. Stylized, vibrant, centered portrait, gaming avatar aesthetic, 1:1 aspect ratio.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Model did not return an image part.');
    }

    res.json({ imageUrl });
  } catch (err: any) {
    console.error('Avatar generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate avatar' });
  }
});

// Setup Vite Development or Static Production Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Discord AI Bot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
