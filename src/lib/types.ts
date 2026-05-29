export type DetectedObject = 'pedestrian' | 'car' | 'obstacle' | 'traffic_light' | 'animal';
export type TrafficSignal = 'red_light' | 'green_light' | 'yellow_light';
export type EthicsMode = 'Utilitarian' | 'Deontological' | 'Virtue';

export type PerceptionData = {
  objects: DetectedObject[];
  positions: string[];
  signals: TrafficSignal[];
  context: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  imageId: string;
  perceptionData: PerceptionData;
};

export type Decision = {
  decision: 'Brake' | 'Continue' | 'Stop' | 'N/A' | string;
  reason: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  scenarioName: string;
  mode: EthicsMode;
  decision: string;
  outcome: string;
};
