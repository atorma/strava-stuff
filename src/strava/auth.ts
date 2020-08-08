import fs from 'fs/promises';
import path from 'path';
import * as inquirer from 'inquirer';
import strava, { Strava } from 'strava-v3';
import _ from 'lodash';

export type OauthCode = string;

interface OauthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  expiresIn?: number;
}

interface TokenWithScope extends OauthToken {
  scope: string;
}

const tokenFilePath = path.join(__dirname, '../../strava-token.json');

export function configureOauthFromEnv(): void {
  strava.config({
    access_token: '',
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
  });
}

export async function getClientWithScope(scope: string): Promise<Strava> {
  const token = await acquireToken(scope);
  return new strava.client(token.accessToken);
}

export async function acquireToken(scope: string): Promise<OauthToken> {
  let savedToken: TokenWithScope;
  try {
    savedToken = await getSavedToken();
  } catch (err) {
    // Ignored
  }

  if (!savedToken || !isScopeIncludedIn(scope, savedToken.scope)) {
    const code = await getOauthCodeManually(scope);
    const newToken = await getOauthTokenWithCode(code);
    savedToken = { ...newToken, scope };
    await saveToken(savedToken);
  } else {
    const refreshedToken: OauthToken = await refreshToken(
      savedToken.refreshToken
    );
    savedToken = { ...refreshedToken, scope };
    await saveToken(savedToken);
  }

  return savedToken;
}

async function getOauthCodeManually(scope: string): Promise<OauthCode> {
  const url = await strava.oauth.getRequestAccessURL({
    scope,
    approval_prompt: 'auto',
  });
  console.log(`Please open this URL to authenticate: ${url}`);
  const answers = await inquirer.prompt([
    {
      name: 'code',
      type: 'input',
      message: 'Type the code of the return URL here',
    },
  ]);
  return answers.code;
}

async function getOauthTokenWithCode(
  oauthCode: OauthCode
): Promise<OauthToken> {
  const res = await strava.oauth.getToken(oauthCode);
  return mapResponseToToken(res);
}

async function refreshToken(refreshToken: string): Promise<OauthToken> {
  const res = await strava.oauth.refreshToken(refreshToken);
  return mapResponseToToken(res);
}

// Drops athlete data and token_type
function mapResponseToToken(res: any): OauthToken {
  return {
    accessToken: res.access_token,
    expiresAt: new Date(res.expires_at * 1000),
    expiresIn: res.expires_in,
    refreshToken: res.refresh_token,
  };
}

function isScopeIncludedIn(scope: string, inScope: string): boolean {
  const scopes = scope.split(',');
  const inScopes = inScope.split(',');
  return _.difference(scopes, inScopes).length === 0;
}

async function getSavedToken(): Promise<TokenWithScope> {
  const tokenJson = await fs.readFile(tokenFilePath, { encoding: 'utf8' });
  return JSON.parse(tokenJson) as TokenWithScope;
}

async function saveToken(token: TokenWithScope): Promise<void> {
  const tokenJson = JSON.stringify(token);
  await fs.writeFile(tokenFilePath, tokenJson, { encoding: 'utf8' });
}
