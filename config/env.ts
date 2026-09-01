/**
 * Switch environments here only — URLs update for the whole suite.
 * Credentials live in config/env.local.ts (gitignored). Copy from env.local.example.ts.
 */
export type EnvironmentName = 'prod' | 'stage' | 'uat';

export type EnvConfig = {
  baseURL: string;
  username: string;
  password: string;
};

export const activeEnvironment: EnvironmentName = 'prod';

const baseEnvironments: Record<EnvironmentName, EnvConfig> = {
  prod: {
    baseURL: 'https://portal.bluetriangle.com',
    username: '',
    password: '',
  },
  stage: {
    baseURL: 'https://portal.bluetriangle.com',
    username: '',
    password: '',
  },
  uat: {
    baseURL: 'https://portaluat.bluetriangle.com',
    username: '',
    password: '',
  },
};

type LocalOverrides = {
  activeEnvironment?: EnvironmentName;
  environments?: Partial<Record<EnvironmentName, Partial<EnvConfig>>>;
};

function loadLocalOverrides(): LocalOverrides {
  try {
    // Optional local secrets file — not committed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./env.local') as LocalOverrides;
  } catch {
    return {};
  }
}

const local = loadLocalOverrides();

const mergedStage: EnvConfig = {
  ...baseEnvironments.stage,
  ...(local.environments?.stage || {}),
};

const mergedUat: EnvConfig = {
  ...baseEnvironments.uat,
  ...(local.environments?.uat || {}),
};

// UAT uses stage credentials when uat username/password are not set locally
if (!mergedUat.username && mergedStage.username) {
  mergedUat.username = mergedStage.username;
  mergedUat.password = mergedStage.password;
}

export const environments: Record<EnvironmentName, EnvConfig> = {
  prod: { ...baseEnvironments.prod, ...(local.environments?.prod || {}) },
  stage: mergedStage,
  uat: mergedUat,
};

export const config = environments[local.activeEnvironment || activeEnvironment];
