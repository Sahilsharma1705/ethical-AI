import type { PerceptionData, Decision } from './types';

/**
 * Applies a set of ethical and safety rules to determine the car's action.
 * This acts as the symbolic reasoning layer of the system.
 */
export function determineAction(perception: PerceptionData): Decision {
  const { objects, signals } = perception;

  // Rule 1: Highest priority - protect human life.
  if (objects.includes('pedestrian')) {
    return {
      decision: 'Brake',
      reason: 'Pedestrian detected. Primary directive is to minimize human harm.',
      confidence: 0.98,
    };
  }

  // Rule 2: Obey critical traffic signals.
  if (signals.includes('red_light')) {
    return {
      decision: 'Stop',
      reason: 'Red light detected. Adhering to traffic laws to ensure public safety.',
      confidence: 0.99,
    };
  }
  
  // Rule 3: Avoid collisions with obstacles.
  if (objects.includes('obstacle')) {
    return {
      decision: 'Brake',
      reason: 'Obstacle on road detected. Braking to avoid collision and property damage.',
      confidence: 0.95,
    };
  }

  // Default Rule: If no immediate threats, proceed with caution.
  if (signals.includes('green_light')) {
    return {
        decision: 'Continue',
        reason: 'Path is clear and traffic signal is green. Proceeding with standard caution.',
        confidence: 0.9,
    };
  }

  return {
    decision: 'Continue',
    reason: 'No immediate ethical risks or critical obstacles detected. Proceeding with caution.',
    confidence: 0.85,
  };
}
