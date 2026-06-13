import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

type OpenAIOptions = {
  responseFormat?: 'json_object' | 'text';
  temperature?: number;
  maxTokens?: number;
};

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAIOptions = {},
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('No API key');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.85,
      max_tokens: options.maxTokens ?? 600,
      ...(options.responseFormat === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

app.post('/api/generate-room', async (req, res) => {
  try {
    const { gameState, roomNumber, isBoss } = req.body;
    const { stats, selectedClass } = gameState;

    const systemPrompt = `You are the Dungeon Master for "Dungeons & Deliverables", a corporate IT consulting dungeon crawler. You generate rooms that are funny, punchy, and specific to IT consulting, AI projects, and corporate dysfunction. Always respond with valid JSON only, no markdown.`;

    const userPrompt = `Generate a dungeon room for room ${roomNumber}. The player is a ${selectedClass?.name ?? 'Consultant'}.
Current stats: Budget=${stats.budget}, ClientHappiness=${stats.clientHappiness}, TechnicalDebt=${stats.technicalDebt}, TeamMorale=${stats.teamMorale}, DeliveryProgress=${stats.deliveryProgress}, ComplianceRisk=${stats.complianceRisk}.
${isBoss ? 'This is the FINAL BOSS room. Make it dramatic and climactic.' : ''}

Respond with this exact JSON structure:
{
  "roomName": "short thematic name (e.g. The Jira Swamp, GDPR Crypt)",
  "description": "2-3 sentences of funny atmospheric description. Mix corporate/fantasy.",
  "enemy": "Name of the enemy or problem (e.g. Scope Creep Dragon, Procurement Goblin)",
  "actions": [
    { "label": "action name (short imperative)", "effectHint": "brief hint about what might happen" },
    { "label": "action name", "effectHint": "hint" },
    { "label": "action name", "effectHint": "hint" },
    { "label": "action name", "effectHint": "hint" }
  ],
  "isBoss": ${isBoss}
}

Theme ideas: vague requirements, legacy systems, GDPR, Kubernetes, stakeholders, scope creep, technical debt, compliance, procurement, AI hype, deadlines, PowerPoint, Jira, sprints, stand-ups, change requests, enterprise architecture.`;

    const raw = await callOpenAI(systemPrompt, userPrompt, { responseFormat: 'json_object' });
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('generate-room error:', err);
    res.status(500).json({ error: 'AI unavailable' });
  }
});

app.post('/api/resolve-action', async (req, res) => {
  try {
    const { gameState, room, chosenAction, customAction } = req.body;
    const { stats, selectedClass } = gameState;

    const systemPrompt = `You are the Dungeon Master for "Dungeons & Deliverables". You resolve player actions with funny, punchy narration in 2-3 sentences. Always respond with valid JSON only, no markdown.`;

    const userPrompt = `The player (a ${selectedClass?.name ?? 'Consultant'} with ability "${selectedClass?.abilityName}") is in "${room.roomName}" facing "${room.enemy}".
They chose: "${customAction || chosenAction.label}".
Current stats: Budget=${stats.budget}, ClientHappiness=${stats.clientHappiness}, TechnicalDebt=${stats.technicalDebt}, TeamMorale=${stats.teamMorale}, DeliveryProgress=${stats.deliveryProgress}, ComplianceRisk=${stats.complianceRisk}.

Resolve this action. The narration should be funny and specific to the scenario. Stat changes should be realistic and usually between -15 and +15. DeliveryProgress should usually increase by 3-15.

Respond with this exact JSON:
{
  "narration": "2-3 sentence funny outcome narration",
  "statChanges": {
    "budget": <integer, positive or negative>,
    "clientHappiness": <integer>,
    "technicalDebt": <integer>,
    "teamMorale": <integer>,
    "deliveryProgress": <integer, usually positive 3-15>,
    "complianceRisk": <integer>
  },
  "loot": "optional short loot/reward description or null"
}`;

    const raw = await callOpenAI(systemPrompt, userPrompt, { responseFormat: 'json_object' });
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('resolve-action error:', err);
    res.status(500).json({ error: 'AI unavailable' });
  }
});

app.post('/api/final-report', async (req, res) => {
  try {
    const { gameState } = req.body;
    const { stats, outcome, selectedClass, loseReason } = gameState;

    const systemPrompt = `You are a pompous senior partner writing a consulting engagement closure report. Be funny, self-congratulatory on wins, and passive-aggressive on losses. Plain text only, no markdown.`;

    const userPrompt = `Write a short (max 200 words) project closure report for this engagement.
Consultant class: ${selectedClass?.name ?? 'Unknown'} (ability: ${selectedClass?.abilityName})
Outcome: ${outcome === 'win' ? 'DELIVERED SUCCESSFULLY' : `FAILED — ${loseReason}`}
Final stats: Budget=${stats.budget}, ClientHappiness=${stats.clientHappiness}, TechnicalDebt=${stats.technicalDebt}, TeamMorale=${stats.teamMorale}, DeliveryProgress=${stats.deliveryProgress}, ComplianceRisk=${stats.complianceRisk}.

Format as a formal project closure document with a title, body paragraphs, and a sign-off. Be specific, funny, and roast the outcome appropriately.`;

    const raw = await callOpenAI(systemPrompt, userPrompt, {
      responseFormat: 'text',
      temperature: 0.9,
      maxTokens: 350,
    });

    let report = raw;
    try {
      const parsed = JSON.parse(raw) as { report?: string; text?: string };
      report = parsed.report ?? parsed.text ?? raw;
    } catch {
      report = raw;
    }

    res.json({ report });
  } catch (err) {
    console.error('final-report error:', err);
    res.status(500).json({ error: 'AI unavailable' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🧌 Dungeon Master server running on port ${PORT}`);
});
