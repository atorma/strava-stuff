import { program } from 'commander';
import { getFilesInDirectory } from './files/file-utils';
import asyncPool from 'tiny-async-pool';
import { basename, extname } from 'path';
import { StravaUploader } from './strava/upload';
import { configureOauthFromEnv, getClientWithScope } from './strava/auth';
import { parseFile } from './fit/parse';
import {
  getActivityType,
  getGearId,
  isTrainer,
} from './strava/activity-properties';

configureOauthFromEnv();

program
  .requiredOption('-d, --directory <path>', 'directory path of fit files')
  .parse(process.argv);

(async () => {
  const filePaths = await getFilesInDirectory(program.directory);
  const client = await getClientWithScope('activity:read,activity:write');
  const uploader = new StravaUploader(client);
  try {
    await asyncPool(5, filePaths, async (filePath) => {
      const fileName = basename(filePath);
      const dataType = extname(filePath).replace('.', '') as any;
      let event;
      try {
        event = await parseFile(filePath);
      } catch (err) {
        // skip invalid file
      }
      const activityType = getActivityType(fileName, event);
      const gearId = getGearId(activityType);
      const trainer = isTrainer(event, activityType);
      const result = await uploader.upload({
        filePath,
        dataType,
        activityType,
        gearId,
        trainer,
      });
      console.log(`${fileName}: ${JSON.stringify(result)}`);
    });
  } catch (err) {
    console.error(err.message);
  }
})();
