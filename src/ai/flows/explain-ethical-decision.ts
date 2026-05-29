'use server';

/**
 * @fileOverview Generates a natural language explanation of an ethical decision.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainEthicalDecisionInputSchema = z.object({
  decision: z.string().describe('The ethical decision made by the system.'),
  reasoning: z.string().describe('The symbolic reasoning that led to the decision.'),
  context: z.string().describe('The scene context and ethics mode.'),
});
export type ExplainEthicalDecisionInput = z.infer<typeof ExplainEthicalDecisionInputSchema>;

const ExplainEthicalDecisionOutputSchema = z.object({
  explanation: z.string().describe('A natural language explanation of the ethical decision.'),
});
export type ExplainEthicalDecisionOutput = z.infer<typeof ExplainEthicalDecisionOutputSchema>;

export async function explainEthicalDecision(input: ExplainEthicalDecisionInput): Promise<ExplainEthicalDecisionOutput> {
  return explainEthicalDecisionFlow(input);
}

const explainPrompt = ai.definePrompt({
  name: 'explainEthicalDecisionPrompt',
  input: {schema: ExplainEthicalDecisionInputSchema},
  output: {schema: ExplainEthicalDecisionOutputSchema},
  prompt: `You are an AI ethics auditor for autonomous vehicles.
  
  Generate a professional, calm, and clear human-readable explanation for the following decision.
  The goal is to provide transparency to the vehicle's passengers and legal auditors.

  LOGIC_TRACE:
  - DECISION_RESULT: {{{decision}}}
  - SYMBOLIC_REASON: {{{reasoning}}}
  - FRAMEWORK_CONTEXT: {{{context}}}

  EXPLAINABLE_AI_OUTPUT (XAI):`,
});

const explainEthicalDecisionFlow = ai.defineFlow(
  {
    name: 'explainEthicalDecisionFlow',
    inputSchema: ExplainEthicalDecisionInputSchema,
    outputSchema: ExplainEthicalDecisionOutputSchema,
  },
  async input => {
    const {output} = await explainPrompt(input);
    return output!;
  }
);
