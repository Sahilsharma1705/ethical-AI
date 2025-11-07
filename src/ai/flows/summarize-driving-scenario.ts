'use server';

/**
 * @fileOverview Summarizes the driving scenario from object detection data for ethical reasoning.
 *
 * - summarizeDrivingScenario - A function that summarizes the driving scenario.
 * - SummarizeDrivingScenarioInput - The input type for the summarizeDrivingScenario function.
 * - SummarizeDrivingScenarioOutput - The return type for the summarizeDrivingScenario function.
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

  Given the following information about the driving scene, create a concise and human-readable summary of the ethical dilemma the car faces.

  Objects: {{objects}}
  Positions: {{positions}}
  Signals: {{signals}}
  Context: {{context}}

  Scenario Summary: `,
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
