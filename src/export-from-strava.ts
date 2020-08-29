import { program } from 'commander';
import { configureOauthFromEnv, getClientWithScope } from './strava/auth';
import { appendActivitiesToCsvFile } from './strava/export-to-csv';

configureOauthFromEnv();

program
  .requiredOption(
    '-f, --file <path>',
    'csv file to append activities to (created if needed)'
  )
  .parse(process.argv);

(async () => {
  const client = await getClientWithScope('activity:read_all');
  try {
    await appendActivitiesToCsvFile(program.file, client);
  } catch (err) {
    console.error(err.message);
  }
})();
