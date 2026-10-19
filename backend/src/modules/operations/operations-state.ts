import { readFile } from 'fs/promises';
import { join } from 'path';

export async function operationState(
  name: 'latest-backup' | 'latest-restore-check' | 'latest-health',
) {
  try {
    const file = await readFile(
      join(process.env.OPERATIONS_DIR || '/app/operations', `${name}.json`),
      'utf8',
    );
    if (file.length > 65536) return null;
    return JSON.parse(file) as Record<string, any>;
  } catch {
    return null;
  }
}
