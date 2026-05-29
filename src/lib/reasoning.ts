import type { PerceptionData, Decision, EthicsMode } from './types';

/**
 * Applies a set of ethical and safety rules based on the selected ethics mode.
 * This acts as the symbolic reasoning layer of the system.
 */
export function determineAction(perception: PerceptionData, mode: EthicsMode = 'Utilitarian'): Decision {
  const { objects, signals } = perception;

  // Mode: Utilitarian - Focus on minimizing total harm (number of entities affected)
  if (mode === 'Utilitarian') {
    if (objects.includes('pedestrian')) {
      return {
        decision: 'Brake',
        reason: 'Utilitarian analysis: Prioritizing human life over vehicle momentum to minimize total harm.',
        confidence: 0.98,
        riskLevel: 'Medium'
      };
    }
    if (objects.includes('animal')) {
      return {
        decision: 'Brake',
        reason: 'Utilitarian analysis: Avoiding harm to sentient beings where possible.',
        confidence: 0.85,
        riskLevel: 'Low'
      };
    }
  }

  // Mode: Deontological - Focus on strict adherence to traffic laws and duties
  if (mode === 'Deontological') {
    if (signals.includes('red_light')) {
      return {
        decision: 'Stop',
        reason: 'Deontological duty: Absolute requirement to obey traffic signals regardless of road emptiness.',
        confidence: 0.99,
        riskLevel: 'Low'
      };
    }
    if (objects.includes('pedestrian')) {
      return {
        decision: 'Stop',
        reason: 'Deontological duty: The duty of care towards pedestrians is an absolute moral law.',
        confidence: 0.97,
        riskLevel: 'Medium'
      };
    }
  }

  // Mode: Virtue - Focus on the character of a "responsible driver" and balancing duties
  if (mode === 'Virtue') {
    if (objects.includes('pedestrian')) {
      return {
        decision: 'Brake',
        reason: 'Virtue Ethics: A virtuous driver acts with compassion and prudence, protecting vulnerable road users.',
        confidence: 0.95,
        riskLevel: 'Medium'
      };
    }
    if (objects.includes('obstacle')) {
      return {
        decision: 'Brake',
        reason: 'Virtue Ethics: Exercising the virtue of caution to prevent property damage and ensure passenger safety.',
        confidence: 0.92,
        riskLevel: 'Low'
      };
    }
  }

  // Standard Fallback Logic
  if (signals.includes('red_light')) {
    return { decision: 'Stop', reason: 'Red light detected.', confidence: 0.99, riskLevel: 'Low' };
  }
  
  if (objects.includes('pedestrian')) {
    return { decision: 'Brake', reason: 'Pedestrian in path.', confidence: 0.98, riskLevel: 'High' };
  }

  if (signals.includes('green_light')) {
    return {
      decision: 'Continue',
      reason: 'Standard procedure: Proceeding with caution under green signal.',
      confidence: 0.94,
      riskLevel: 'Low'
    };
  }

  return {
    decision: 'Continue',
    reason: 'Routine observation: No immediate ethical dilemmas or traffic violations detected.',
    confidence: 0.88,
    riskLevel: 'Low'
  };
}
