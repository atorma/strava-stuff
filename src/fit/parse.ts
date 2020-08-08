import { SportsLib } from '@sports-alliance/sports-lib';
import { readFile } from 'fs/promises';
import { ActivityType } from '../strava/strava.types';
import { EventInterface } from '@sports-alliance/sports-lib/lib/events/event.interface';

export type ActivityMetadata = {
  startDate: Date;
  types: string[];
  stravaType?: ActivityType;
  distance: {
    value: number;
    unit: string;
  };
  duration: {
    value: number;
    unit: string;
  };
  isMultisport: boolean;
};

export function parseFile(filePath: string): Promise<EventInterface> {
  return parseFitFile(filePath);
}

async function parseFitFile(filePath: string): Promise<EventInterface> {
  try {
    const buffer = await readFile(filePath);
    return await SportsLib.importFromFit(buffer.buffer);
  } catch (err) {
    throw new Error(`Error when parsing file "${filePath}"`);
  }
}
