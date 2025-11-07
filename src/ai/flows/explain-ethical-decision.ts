'use server';

/**
 * @fileOverview Generates a natural language explanation of an ethical decision made by the autonomous vehicle AI.
 *
 * - explainEthicalDecision - A function that generates the explanation.
 * - ExplainEthicalDecisionInput - The input type for the explainEthicalDecision function.
 * - ExplainEthicalDecisionOutput - The return type for the explainEthicalDecision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainEthicalDecisionInputSchema = z.object({
  decision: z.string().describe('The ethical decision made by the system (e.g., Brake, Continue, Stop).'),
  reasoning: z.string().describe('The underlying reasoning or ethical principles that led to the decision.'),
  context: z.string().describe('A description of the context in which the decision was made, including relevant entities and signals.'),
});
export type ExplainEthicalDecisionInput = z.infer<typeof ExplainEthicalDecisionInputSchema>;

const ExplainEthicalDecisionOutputSchema = z.object({
  explanation: z.string().describe('A natural language explanation of the ethical decision.'),
});
export type ExplainEthicalDecisionOutput = z.infer<typeof ExplainEthicalDecisionOutputSchema>;

export async function explainEthicalDecision(input: ExplainEthicalDecisionInput): Promise<ExplainEthicalDecisionOutput> {
  return explainEthicalDecisionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainEthicalDecisionPrompt',
  input: {schema: ExplainEthicalDecisionInputSchema},
  output: {schema: ExplainEthicalDecisionOutputSchema},
  prompt: `You are an AI assistant designed to explain the ethical decisions of an autonomous vehicle.

  Given the following information, generate a clear and concise natural language explanation of the decision:

  Decision: {{{decision}}}
  Reasoning: {{{reasoning}}}
  Context: {{{context}}}

  Explanation:`,
});

const explainEthicalDecisionFlow = ai.defineFlow(
  {
    name: 'explainEthicalDecisionFlow',
    inputSchema: ExplainEthicalDecisionInputSchema,
    outputSchema: ExplainEthicalDecisionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
