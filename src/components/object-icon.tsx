import { CarFront, PersonStanding, TrafficCone, Dog } from 'lucide-react';
import { TrafficLightIcon } from '@/components/icons/traffic-light-icon';
import type { DetectedObject } from '@/lib/types';

interface ObjectIconProps {
  object: DetectedObject;
  className?: string;
}

export function ObjectIcon({ object, className }: ObjectIconProps) {
  switch (object) {
    case 'pedestrian':
      return <PersonStanding className={className} />;
    case 'car':
      return <CarFront className={className} />;
    case 'traffic_light':
      return <TrafficLightIcon className={className} />;
    case 'obstacle':
        return <TrafficCone className={className} />;
    case 'animal':
        return <Dog className={className} />;
    default:
      return null;
  }
}
