import * as fs from 'fs/promises';
import { join } from 'path';

export async function getFilesInDirectory(
  directoryPath: string
): Promise<string[]> {
  const fileNames = await fs.readdir(directoryPath);
  return fileNames
    .sort((f1, f2) => f1.toLowerCase().localeCompare(f2.toLowerCase()))
    .map((fileName) => join(directoryPath, fileName));
}
