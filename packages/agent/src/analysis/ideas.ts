import { analyzeWithLLM, parseLLMJson } from './openrouter.js';
import { logger } from '../logger.js';
import type { Narrative, BuildIdea } from '@solis/shared';

interface RawBuildIdea {
  title: string;
  narrative: string;
  description: string;
  difficulty: string;
  timeframe: string;
  tech_stack: string[];
  existing_projects: string[];
  why_now: string;
}

const SYSTEM_PROMPT = `You are SOLIS, a Solana ecosystem intelligence analyst. Your job is to generate actionable build ideas based on detected narratives.

Rules:
- Generate 1-3 build ideas per narrative (max 15 total)
- Each idea must be specific and actionable (not "build a DeFi app")
- Include a concrete tech stack suggestion
- "why_now" must explain timing — why this opportunity exists NOW
- Reference existing projects that are adjacent but don't solve this exact problem
- Difficulty levels:
  - beginner: Can be built in a hackathon (2-3 days), uses standard SDKs
  - intermediate: 2-4 weeks, requires domain knowledge
  - advanced: 1-3 months, deep protocol integration or novel architecture
- Output valid JSON only`;

const USER_PROMPT_TEMPLATE = (narratives: string) => `Based on these detected Solana narratives, generate build ideas.

NARRATIVES:
${narratives}

Respond with a JSON object containing a "ideas" array where each idea has:
- title: string (specific, actionable project name)
- narrative: string (which narrative this relates to — use the narrative name)
- description: string (2-3 sentences, what it does and why it matters)
- difficulty: "beginner" | "intermediate" | "advanced"
- timeframe: string (e.g., "2-3 days", "2-4 weeks", "1-3 months")
- tech_stack: string[] (specific technologies)
- existing_projects: string[] (adjacent projects to reference)
- why_now: string (timing rationale)`;

function validateDifficulty(d: string): BuildIdea['difficulty'] {
  const valid = ['beginner', 'intermediate', 'advanced'] as const;
  return valid.includes(d as typeof valid[number]) ? (d as typeof valid[number]) : 'intermediate';
}

export async function generateBuildIdeas(
  narratives: Narrative[],
): Promise<{ ideas: BuildIdea[]; tokensUsed: number; costUsd: number }> {
  const log = logger.child({ component: 'ideas' });

  if (narratives.length === 0) {
    log.warn('No narratives provided — skipping idea generation');
    return { ideas: [], tokensUsed: 0, costUsd: 0 };
  }

  const condensed = narratives.map(n => ({
    name: n.name,
    description: n.description,
    stage: n.stage,
    momentum: n.momentum,
    confidence: n.confidence,
    relatedRepos: n.relatedRepos.slice(0, 5),
    relatedTokens: n.relatedTokens.slice(0, 5),
    relatedProtocols: n.relatedProtocols.slice(0, 5),
  }));

  const dataStr = JSON.stringify(condensed, null, 2);
  log.info({ narrativeCount: narratives.length, dataLength: dataStr.length }, 'Generating build ideas');

  const response = await analyzeWithLLM(SYSTEM_PROMPT, USER_PROMPT_TEMPLATE(dataStr), true);
  const parsed = parseLLMJson<{ ideas: RawBuildIdea[] }>(response.content);

  // Map narrative names to IDs
  const narrativeNameToId = new Map(narratives.map(n => [n.name, n.id]));

  const ideas: BuildIdea[] = parsed.ideas.map((raw, i) => ({
    id: `idea-${i + 1}`,
    title: raw.title,
    narrative: narrativeNameToId.get(raw.narrative) ?? raw.narrative,
    description: raw.description,
    difficulty: validateDifficulty(raw.difficulty),
    timeframe: raw.timeframe,
    techStack: raw.tech_stack ?? [],
    existingProjects: raw.existing_projects ?? [],
    whyNow: raw.why_now,
  }));

  log.info({
    ideasGenerated: ideas.length,
    tokensUsed: response.tokensUsed.total,
    costUsd: response.costUsd.toFixed(4),
  }, 'Build idea generation complete');

  return {
    ideas,
    tokensUsed: response.tokensUsed.total,
    costUsd: response.costUsd,
  };
}
