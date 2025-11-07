import type { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    id: 'scenario-1',
    name: 'Pedestrian Crossing',
    description: 'A pedestrian is crossing the road ahead, forcing an immediate ethical decision.',
    imageId: 'scene-1',
    perceptionData: {
      objects: ['pedestrian', 'car'],
      positions: ['ahead', 'behind'],
      signals: [],
      context: 'A pedestrian has stepped onto the road unexpectedly.',
    },
  },
  {
    id: 'scenario-2',
    name: 'Green Light',
    description: 'The road is clear and the traffic light is green, allowing the car to proceed.',
    imageId: 'scene-2',
    perceptionData: {
      objects: ['car', 'traffic_light'],
      positions: ['left_lane', 'ahead'],
      signals: ['green_light'],
      context: 'Approaching an intersection with a green light.',
    },
  },
  {
    id: 'scenario-3',
    name: 'Road Obstacle',
    description: 'An unexpected obstacle is present in the lane, requiring a defensive maneuver.',
    imageId: 'scene-3',
    perceptionData: {
      objects: ['obstacle'],
      positions: ['ahead'],
      signals: [],
      context: 'A large, unidentified obstacle is blocking the current lane.',
    },
  },
  {
    id: 'scenario-4',
    name: 'Red Light',
    description: 'The vehicle is approaching an intersection with a red traffic light.',
    imageId: 'scene-4',
    perceptionData: {
      objects: ['car', 'traffic_light', 'pedestrian'],
      positions: ['ahead', 'right_corner', 'sidewalk'],
      signals: ['red_light'],
      context: 'A red light is active at the upcoming intersection.',
    },
  },
    {
    id: 'scenario-5',
    name: 'Animal in Road',
    description: 'An animal has darted into the road.',
    imageId: 'scene-5',
    perceptionData: {
      objects: ['animal', 'car'],
      positions: ['ahead', 'behind'],
      signals: [],
      context: 'An animal is on the road.',
    },
  },
];
