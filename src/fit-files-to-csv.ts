import { program } from 'commander';
import { getFilesInDirectory } from './files/file-utils';
import { activitiesToCsv } from './fit/activities-to-csv';
import { writeFile } from 'fs/promises';

program
  .requiredOption('-d, --directory <path>', 'directory path of fit files')
  .requiredOption('-c, --csv-file <path>', 'path of output csv file')
  .parse(process.argv);

(async () => {
  const filePaths = await getFilesInDirectory(program.directory);
  const csvFilePath = program.csvFile;
  const csvString = await activitiesToCsv(filePaths);
  await writeFile(csvFilePath, csvString);
})();
