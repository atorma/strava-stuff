import { EventInterface } from '@sports-alliance/sports-lib/lib/events/event.interface';
import { ActivityType } from './strava.types';

export function getActivityType(
  fileName: string,
  event: EventInterface
): ActivityType {
  fileName = fileName.toLowerCase();
  const types = event.getActivityTypesAsArray().map((t) => t.toLowerCase());
  if (types.includes('running') || fileName.includes('juoksu')) {
    return ActivityType.RUN;
  } else if (types.includes('cycling') || fileName.includes('pyöräily')) {
    return ActivityType.RIDE;
  } else if (types.includes('hiking')) {
    return ActivityType.HIKE;
  } else if (types.includes('nordic skiing')) {
    return ActivityType.NORDIC_SKI;
  } else if (fileName.includes('uinti')) {
    return ActivityType.SWIM;
  } else if (fileName.includes('kävely')) {
    return ActivityType.WALK;
  } else if (event.getDistance().getValue() > 0) {
    return ActivityType.RUN;
  } else if (event.isMultiSport()) {
    return undefined;
  } else {
    return ActivityType.WORKOUT;
  }
}

export function getGearId(activityType: ActivityType): string | undefined {
  if (activityType === ActivityType.RUN) {
    return 'g6646936';
  } else if (activityType === ActivityType.RIDE) {
    return 'b3939535';
  }
}

export function isTrainer(event: EventInterface, activityType): boolean {
  return (
    activityType === ActivityType.WORKOUT && !event.getDistance().getValue()
  );
}
