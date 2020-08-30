import { Strava } from 'strava-v3';
import csvStringify, { Stringifier } from 'csv-stringify';
import csvParse, { Parser } from 'csv-parse';
import { ActivityType } from './strava.types';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline, Readable } from 'stream';

interface Activity {
  id: number;
  type: ActivityType;
  startedAt: Date;
  movingTime: number;
  elapsedTime: number;
  distance: number;
  averageSpeed: number;
  averageWatts: number;
  weightedAverageWatts: number;
  deviceWatts: boolean;
  averageHeartRate: number;
  averageCadence: number;
  totalElevationGain: number;
  trainer: boolean;
}

const CSV_COLUMNS = [
  'id',
  'type',
  'startedAt',
  'movingTime',
  'elapsedTime',
  'distance',
  'averageSpeed',
  'averageWatts',
  'weightedAverageWatts',
  'deviceWatts',
  'averageHeartRate',
  'averageCadence',
  'totalElevationGain',
  'trainer',
];

export async function appendActivitiesToCsvFile(
  filePath: string,
  client: Strava
): Promise<void> {
  const oldestActivity = await findOldestActivityFromFile(filePath);
  console.log(
    `Oldest activity in ${filePath}: ${
      oldestActivity ? oldestActivity.startedAt.toISOString() : '(none)'
    }`
  );
  const activityStream = new StravaApiActivityStream(client, {
    before: oldestActivity ? oldestActivity.startedAt : undefined,
  });
  const stringifier = getCsvStringifierStream();
  const writeStream = createWriteStream(filePath, { flags: 'a' });
  return new Promise<void>((resolve, reject) => {
    pipeline(activityStream, stringifier, writeStream, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getCsvStringifierStream(): Stringifier {
  return csvStringify({
    columns: CSV_COLUMNS,
    quoted: true,
    cast: {
      boolean: (value) => (value ? 'True' : 'False'),
      date: (value) => value.toISOString(),
    },
  });
}

async function findOldestActivityFromFile(
  filePath: string
): Promise<Activity | undefined> {
  const readStream = createReadStream(filePath);
  const parser = getCsvParserStream();
  readStream.pipe(parser);
  return findOldestActivityFromCsvStream(parser);
}

function getCsvParserStream(): Parser {
  return csvParse({
    columns: CSV_COLUMNS,
    cast(value, context) {
      switch (context.column) {
        case 'id':
          return parseInt(value);
        case 'type':
          return value;
        case 'startedAt':
          return new Date(value);
        case 'trainer':
          return value === 'True';
        case 'devicePower':
          return value === 'True';
        default:
          return parseFloat(value);
      }
    },
  });
}

async function findOldestActivityFromCsvStream(
  parser: Parser
): Promise<Activity> {
  let oldest: Activity;
  for await (const activity of parser) {
    if (!oldest || oldest.startedAt.valueOf() > activity.startedAt.valueOf()) {
      oldest = activity;
    }
  }
  return oldest;
}

type ActivityApiParams = {
  page?: number;
  per_page?: number;
  before?: number;
  after?: number;
};

class StravaApiActivityStream extends Readable {
  private strava: Strava;
  private buffer: Activity[] = [];
  private nextPage = 1;
  private query: { before?: Date } = {};

  constructor(client: Strava, query: { before?: Date }) {
    super({ objectMode: true });
    this.strava = client;
    this.query = query;
  }

  async _read() {
    if (!this.buffer.length) {
      await this.fillBuffer();
    }

    if (this.buffer.length) {
      const [activity] = this.buffer.splice(0, 1);
      this.push(activity);
    } else {
      this.push(null);
    }
  }

  private async fillBuffer() {
    try {
      const apiParams: ActivityApiParams = {
        page: this.nextPage,
        per_page: 200,
      };
      if (this.query.before) {
        apiParams.before = this.query.before.valueOf() / 1000;
      }
      const data: Array<Record<
        string,
        any
      >> = await this.strava.athlete.listActivities(apiParams);
      console.log(`Fetched page ${this.nextPage}, ${data.length} activities`);
      this.buffer.splice(this.buffer.length, 0, ...data.map(transformApiData));
      this.nextPage++;
    } catch (err) {
      console.error(err.message);
      this.destroy(err);
    }
  }
}

function transformApiData(data: Record<string, any>): Activity {
  return {
    id: data.id,
    type: data.type,
    startedAt: new Date(Date.parse(data.start_date)),
    movingTime: data.moving_time,
    elapsedTime: data.elapsed_time,
    distance: data.distance,
    averageSpeed: data.average_speed,
    averageWatts: data.average_watts,
    weightedAverageWatts: data.weighted_average_watts,
    deviceWatts: data.device_watts,
    averageHeartRate: data.average_heartrate,
    averageCadence: data.average_cadence,
    totalElevationGain: data.total_elevation_gain,
    trainer: data.trainer,
  };
}
