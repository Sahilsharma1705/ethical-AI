
'use server';

/**
 * @fileOverview Summarizes the driving scenario from object detection data for ethical reasoning.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDrivingScenarioInputSchema = z.object({
  objects: z.array(z.string()).describe('List of detected objects in the scene.'),
  positions: z.array(z.string()).describe('Positions of the detected objects.'),
  signals: z.array(z.string()).describe('Detected traffic signals.'),
  context: z.string().describe('Additional context about the driving scenario.'),
});
export type SummarizeDrivingScenarioInput = z.infer<
  typeof SummarizeDrivingScenarioInputSchema
>;

const SummarizeDrivingScenarioOutputSchema = z.object({
  scenarioSummary: z
    .string()
    .describe('A human-readable summary of the ethical scenario.'),
});
export type SummarizeDrivingScenarioOutput = z.infer<
  typeof SummarizeDrivingScenarioOutputSchema
>;

export async function summarizeDrivingScenario(
  input: SummarizeDrivingScenarioInput
): Promise<SummarizeDrivingScenarioOutput> {
  return summarizeDrivingScenarioFlow(input);
}

const summarizeDrivingScenarioPrompt = ai.definePrompt({
  name: 'summarizeDrivingScenarioPrompt',
  input: {schema: SummarizeDrivingScenarioInputSchema},
  output: {schema: SummarizeDrivingScenarioOutputSchema},
  prompt: `You are an AI agent specializing in summarizing driving scenarios for ethical reasoning.

  Given the following neuro-symbolic facts about the driving scene, create a concise and human-readable summary of the ethical dilemma or situation the car faces. Focus on clarity for a human auditor.

  FACT_BASE:
  - Detected Objects: {{#each objects}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - Object Positions: {{#each positions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - Traffic Signals: {{#each signals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - Scene Context: {{{context}}}

  SCENARIO_SUMMARY: `,
});

const summarizeDrivingScenarioFlow = ai.defineFlow(
  {
    name: 'summarizeDrivingScenarioFlow',
    inputSchema: SummarizeDrivingScenarioInputSchema,
    outputSchema: SummarizeDrivingScenarioOutputSchema,
  },
  async input => {
    const {output} = await summarizeDrivingScenarioPrompt(input);
    return output!;
  }
);
