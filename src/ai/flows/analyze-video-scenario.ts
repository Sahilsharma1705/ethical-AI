'use server';

/**
 * @fileOverview Analyzes a driving scenario from a video.
 *
 * - analyzeVideoScenario - A function that analyzes the driving scenario from a video.
 * - AnalyzeVideoScenarioInput - The input type for the analyzeVideoScenario function.
 * - AnalyzeVideoScenarioOutput - The return type for the analyzeVideoScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVideoScenarioInputSchema = z.object({
  videoDataUri: z.string().describe("A video of a driving scenario, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalyzeVideoScenarioInput = z.infer<typeof AnalyzeVideoScenarioInputSchema>;

const AnalyzeVideoScenarioOutputSchema = z.object({
  scenarioSummary: z.string().describe('A human-readable summary of the ethical scenario in the video.'),
  decision: z.string().describe('The recommended decision (e.g., Brake, Continue, Stop).'),
  reason: z.string().describe('The reasoning behind the recommended decision.'),
});
export type AnalyzeVideoScenarioOutput = z.infer<typeof AnalyzeVideoScenarioOutputSchema>;

export async function analyzeVideoScenario(input: AnalyzeVideoScenarioInput): Promise<AnalyzeVideoScenarioOutput> {
  return analyzeVideoScenarioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVideoScenarioPrompt',
  input: {schema: AnalyzeVideoScenarioInputSchema},
  output: {schema: AnalyzeVideoScenarioOutputSchema},
  prompt: `You are an AI assistant for an autonomous vehicle, specializing in ethical reasoning. Analyze the provided video of a driving scenario.

Based on the video, provide the following:
1.  A concise summary of the ethical dilemma or situation the car is in.
2.  The best course of action (e.g., Brake, Continue, Stop).
3.  A brief justification for your decision based on safety and ethical principles.

Video: {{media url=videoDataUri}}`,
});

const analyzeVideoScenarioFlow = ai.defineFlow(
  {
    name: 'analyzeVideoScenarioFlow',
    inputSchema: AnalyzeVideoScenarioInputSchema,
    outputSchema: AnalyzeVideoScenarioOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
