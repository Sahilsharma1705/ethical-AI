export type DetectedObject = 'pedestrian' | 'car' | 'obstacle' | 'traffic_light';
export type TrafficSignal = 'red_light' | 'green_light' | 'yellow_light';

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
  decision: 'Brake' | 'Continue' | 'Stop' | 'N/A';
  reason: string;
  confidence: number;
}
