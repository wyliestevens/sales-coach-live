import { CoachingResponse } from '@/types';
import { SALES_SYSTEM_PROMPT } from './sales-system-prompt';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function getCoaching(transcript: string): Promise<CoachingResponse> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    temperature: 0.7,
    system: SALES_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the live call transcript (most recent 60 seconds). Analyze and coach me:\n\n${transcript}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(text) as CoachingResponse;
  } catch {
    return {
      sentiment: 'neutral',
      buyingSignals: [],
      objections: [],
      nextLine: 'Keep listening and ask an open-ended question.',
      tactic: 'Active Listening',
      warning: undefined,
    };
  }
}
