/**
 * Switch environments here only — URLs update for the whole suite.
 * Credentials live in config/env.local.ts (gitignored). Copy from env.local.example.ts.
 */
export type EnvironmentName = 'prod' | 'stage';

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

export const environments: Record<EnvironmentName, EnvConfig> = {
  prod: { ...baseEnvironments.prod, ...(local.environments?.prod || {}) },
  stage: { ...baseEnvironments.stage, ...(local.environments?.stage || {}) },
};

export const config = environments[local.activeEnvironment || activeEnvironment];
