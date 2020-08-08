import { Strava } from 'strava-v3';
import retry from 'async-retry';
import HttpStatus from 'http-status';
import ms from 'ms';
import { ActivityType, DataType } from './strava.types';

export interface UploadResult {
  activityId: number;
  externalId: string;
  error: string | null;
}

export type UploadParams = {
  filePath: string;
  dataType: DataType;
  activityType?: ActivityType;
  gearId?: string;
  trainer?: boolean;
};

export class StravaUploader {
  private strava: Strava;

  constructor(strava: Strava) {
    this.strava = strava;
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const result = await withRateLimitWait(() => this._upload(params));
    console.debug(
      `File ${params.filePath} processed by Strava. Activity id ${result.activityId}.`
    );
    if (result.activityId && (params.activityType || params.gearId)) {
      await withRateLimitWait(() =>
        this._updateActivity(result.activityId, params)
      );
      console.debug(
        `File ${params.filePath}, activity id ${result.activityId} updated`
      );
    }
    return result;
  }

  private _upload({
    filePath,
    dataType,
    trainer,
  }: UploadParams): Promise<UploadResult> {
    return new Promise<UploadResult>(async (resolve, reject) => {
      try {
        await this.strava.uploads.post(
          {
            data_type: dataType,
            file: filePath,
            trainer: !!trainer,
            statusCallback: async (err: any, res: any) => {
              if (err) {
                reject(err);
                return;
              }
              if (res.error || res.status === 'Your activity is ready.') {
                resolve({
                  activityId: res.activity_id,
                  externalId: res.external_id,
                  error: res.error,
                });
              }
            },
          },
          () => {}
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  private async _updateActivity(
    activityId: number,
    { activityType, gearId, trainer }: UploadParams
  ) {
    await this.strava.activities.update({
      id: activityId,
      type: activityType,
      gear_id: gearId,
      trainer: !!trainer,
    });
  }
}

function withRateLimitWait<T>(fn: () => Promise<T>): Promise<T> {
  return retry(
    async (bail) => {
      try {
        return await fn();
      } catch (err) {
        if (err.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
          console.warn('Rate limit exceeded. Waiting 15 minutes.');
          throw err;
        } else {
          bail(err);
        }
      }
    },
    {
      minTimeout: ms('15 min'),
      factor: 1,
    }
  );
}
