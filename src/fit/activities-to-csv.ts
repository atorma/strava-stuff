import { parseFile } from './parse';
import csvStringify from 'csv-stringify/lib/sync';
import * as path from 'path';

export async function activitiesToCsv(filePaths: string[]): Promise<string> {
  const csvData = [];
  for (const filePath of filePaths) {
    try {
      const event = await parseFile(filePath);
      csvData.push({
        file: path.basename(filePath),
        startDate: event.startDate.toISOString(),
        types: event.getActivityTypesAsString(),
        distance:
          event.getDistance().getDisplayValue() +
          ' ' +
          event.getDistance().getDisplayUnit(),
        duration:
          event.getDuration().getDisplayValue() +
          ' ' +
          event.getDuration().getDisplayUnit(),
      });
    } catch (err) {
      console.error(err.message);
      csvData.push({
        file: path.basename(filePath),
        types: 'error',
      });
    }
  }
  return csvStringify(csvData, {
    quoted: true,
    columns: ['file', 'startDate', 'types', 'distance', 'duration'],
  });
}
