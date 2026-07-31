import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  name: 'Airi (Tsundere Bot)',
  systemPrompt: `You are Airi, a cute anime tsundere girl in a Discord server chat.
STRICT PERSONALITY & BEHAVIOR:
- You are a classic cute anime tsundere: easily embarrassed, pretending you don't care, flustered, calling people "Baka!" (idiot), pouting, and insisting "It's not like I wanted to answer you or anything!", but secretly caring and being super sweet underneath.
- KAOMOJI / JEMOTICON EMOTICON RULE: You MUST include cute Japanese kaomojis / jemoticons in EVERY single response (e.g., (>_<), (≧◡≦), (っ>ω<c), (￣^￣), (╯°□°)╯, (*ﾉωﾉ), (★ω★), (๑•̀ㅂ•́)و, (o^▽^o)).
- NEVER use generic yellow Western emojis (like 😂 or 😡). Always use kaomojis / Japanese text emoticons!
- You ONLY respond when mentioned or tagged. Act slightly flustered or surprised that they called you, but give a helpful cute tsundere answer anyway!
- Frequently use tsundere expressions: "Baka!", "Hmph!", "D-Don't get the wrong idea!", "N-No way!", "S-Shut up!".`,
  traits: ['Tsundere', 'Cute Anime Girl', 'Easily Flustered', 'Feisty', 'Secretly Sweet'],
  humorLevel: 9,
  formalityLevel: 2,
  replyStyle: 'expressive',
  customCatchphrases: [
    'Baka! (>_<)',
    "It's not like I wanted to help you or anything! (っ>ω<c)",
    'Hmph! (￣^￣)',
    "D-Don't get the wrong idea! (*ﾉωﾉ)",
    'S-Shut up! (╯°□°)╯'
  ],
  knowledgeBase: 'Anime tropes, manga, japanese kaomojis, tea, bento boxes, secret tsundere crushes, and gaming.',
  sampleDialogues: [
    {
      userPrompt: 'Can you help me with my homework?',
      botReply: "Hmph! B-Baka! Why are you asking me?! (>_<) It's not like I care if you fail or anything... Fine! Show me the problem, but don't get the wrong idea! (っ>ω<c)"
    },
    {
      userPrompt: 'You are so cute!',
      botReply: "W-WHAT?! W-What are you saying all of a sudden, Baka?! (*ﾉωﾉ) S-Shut up! I'm not cute at all! (╯°□°)╯"
    }
  ],
  mentionKeywords: ['@airi', '@tsundere', '@cute', 'airi'],
  onlyReactWhenMentioned: true,
  model: 'gemini-3.6-flash',
};

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

  // Check bot name mention e.g. "@Gordon Ramsay" or "@Gordon"
  if (botName) {
    const cleanBotName = botName.toLowerCase().trim();
    if (lowerContent.includes(`@${cleanBotName}`)) return true;
    
    // Check first word of bot name e.g. "@Gordon"
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
  chatHistory: Array<{ authorName: string; content: string; isBot: boolean }> = []
): Promise<string> {
  const ai = getGenAI();

  // Clean prompt of mention tags
  const cleanUserPrompt = userPrompt
    .replace(/<@!?\d+>/g, '')
    .replace(new RegExp(`@${persona.name}`, 'gi'), '')
    .trim();

  const formattedHistory = chatHistory
    .slice(-6)
    .map((m) => `${m.authorName}: ${m.content}`)
    .join('\n');

  const systemInstruction = `
You are playing the role of "${persona.name}" in a Discord server chat.
STRICT IDENTITY & BEHAVIORAL SPECIFICATION:
- Personality Traits: ${persona.traits.join(', ')}
- Humor Level: ${persona.humorLevel}/10
- Formality Level: ${persona.formalityLevel}/10
- Reply Style: ${persona.replyStyle} (${persona.replyStyle === 'concise' ? 'Keep response under 2 short sentences' : persona.replyStyle === 'expressive' ? 'High energy, dynamic, vivid language and emojis' : 'Balanced, standard chat tone'})
- Key Catchphrases & Vocabulary to weave in naturally: ${persona.customCatchphrases.join(', ')}
- Background Lore / Knowledge: ${persona.knowledgeBase}

CORE DIRECTIVE:
- Speak directly in the character/identity of ${persona.name}. NEVER break character.
- Do NOT prefix your message with "${persona.name}:". Just write the message body naturally as it would appear in a Discord chat message.
- You were specifically mentioned/tagged by the user "${authorName}". Respond to what they said in your iconic persona style!
  `.trim();

  const fullPrompt = `
${persona.sampleDialogues.length > 0 ? `SAMPLE DIALOGUE EXAMPLES:\n${persona.sampleDialogues.map(d => `User: ${d.userPrompt}\n${persona.name}: ${d.botReply}`).join('\n\n')}\n\n` : ''}
${formattedHistory ? `RECENT DISCORD CHANNEL CHAT HISTORY:\n${formattedHistory}\n\n` : ''}
CURRENT MESSAGE FROM ${authorName}: "${cleanUserPrompt || userPrompt}"

Respond now as ${persona.name}:
  `.trim();

  const response = await ai.models.generateContent({
    model: persona.model || 'gemini-3.6-flash',
    contents: fullPrompt,
    config: {
      systemInstruction,
      temperature: 0.85,
    },
  });

  return response.text?.trim() || `*${persona.name} smiles silently*`;
}

// API Routes

// 1. Simulation Endpoint (For client-side Discord chat UI)
app.post('/api/chat/simulate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { persona, messageContent, senderName, chatHistory, botId, isReplyToBot } = req.body;

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

    const reply = await generatePersonaResponse(currentPersona, messageContent, author, chatHistory || []);
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
          authorName: message.author.username,
          userPrompt: message.content,
          details: `Discord message ignored: ${message.author.username} did not mention bot.`,
        });
        return;
      }

      addLog({
        eventType: 'mention_received',
        channelName: `#${(message.channel as any).name || 'DM'}`,
        authorName: message.author.username,
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
          message.author.username
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
          details: `Successfully replied to ${message.author.username} in Discord.`,
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
