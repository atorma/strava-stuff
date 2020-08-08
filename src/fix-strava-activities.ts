import { configureOauthFromEnv, getClientWithScope } from './strava/auth';
import { getGearId } from './strava/activity-properties';
import { ActivityType } from './strava/strava.types';

configureOauthFromEnv();

const afterEpoch = new Date('2009-01-01T00:00').getTime() / 1000;
const beforeEpoch = new Date('2016-01-01T00:00').getTime() / 1000;

(async () => {
  const client = await getClientWithScope('activity:read,activity:write');
  let page = 1;
  while (true) {
    console.log(`Getting page ${page}...`);
    const activities: Array<any> = await client.athlete.listActivities({
      page,
      per_page: 200,
      after: afterEpoch,
      before: beforeEpoch,
    });
    console.log(`Got page ${page}, ${activities.length} activities`);
    if (!activities.length) {
      console.log(`No more activities. Stopping.`);
      break;
    } else {
      page = page + 1;
    }
    for (const activity of activities) {
      const fixedType = getFixedType(activity);
      const fixedGearId = getFixedGearId({ ...activity, type: fixedType });
      const fixedTrainer = isTrainer({
        ...activity,
        type: fixedType,
        gear_id: fixedGearId,
      });
      const updates: Record<string, any> = JSON.parse(
        JSON.stringify({
          type: fixedType !== activity.type ? fixedType : undefined,
          gear_id: fixedGearId !== activity.gear_id ? fixedGearId : undefined,
          trainer: fixedTrainer !== activity.trainer ? fixedTrainer : undefined,
        })
      );
      if (Object.keys(updates).length) {
        await client.activities.update({
          id: activity.id,
          ...updates,
        });
        console.log(
          `Updated activity ${activity.id}: ${JSON.stringify(updates)}`
        );
      }
    }
  }
})();

function getFixedGearId(activity: any): string | null {
  const startDate = new Date(Date.parse(activity.start_date));

  if (activity.type === ActivityType.RUN) {
    const runMaxDate = new Date('2014-06-04T00:00');
    if (startDate.getTime() <= runMaxDate.getTime()) {
      return getGearId(ActivityType.RUN);
    } else {
      return activity.gear_id;
    }
  }

  if (activity.type === ActivityType.RIDE) {
    return getGearId(ActivityType.RIDE);
  }

  if (activity.type === ActivityType.HIKE) {
    return getGearId(ActivityType.RUN);
  }

  return null;
}

function getFixedType(activity: any): ActivityType {
  const name: string = activity.name.toLowerCase();

  if (name.includes('golf') || name.includes('triathlon')) {
    return ActivityType.WORKOUT;
  }

  if (activity.type === ActivityType.WORKOUT && activity.distance > 0) {
    return ActivityType.RUN;
  }

  return activity.type;
}

function isTrainer(activity: any): boolean {
  return activity.type === ActivityType.WORKOUT && !activity.distance;
}
