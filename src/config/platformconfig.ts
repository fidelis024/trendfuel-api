import { PlatformConfig, IPlatformConfig } from '../schemas/mongoose/platformconfig.model';

let cachedConfig: IPlatformConfig | null = null;

// ─── Get Config (with caching) ─────────────────────────────
export const getConfig = async (): Promise<IPlatformConfig> => {
  if (cachedConfig) return cachedConfig;

  let config = await PlatformConfig.findOne();

  if (!config) {
    config = await PlatformConfig.create({
      commissionRate: 0.2,
      sellerAccessFee: 1500,
      withdrawalFeeRate: 0.03,
      orderAutoCompleteHours: 72,
      sellerRespondHours: 48,
      withdrawalDelayDays: 7,
    });
  }

  cachedConfig = config;
  return config;
};

// ─── Helpers (THIS IS WHAT YOU USE EVERYWHERE) ─────────────────

export const getCommissionRate = async (): Promise<number> => {
  const config = await getConfig();
  return config.commissionRate;
};

export const getAutoCompleteHours = async (): Promise<number> => {
  const config = await getConfig();
  return config.orderAutoCompleteHours;
};

// ─── Update Config ────────────────────────────────────────────
export const updateConfig = async (
  updates: Partial<{
    commissionRate: number;
    sellerAccessFee: number;
    withdrawalFeeRate: number;
    orderAutoCompleteHours: number;
    sellerRespondHours: number;
    withdrawalDelayDays: number;
  }>,
  updatedBy: string
): Promise<IPlatformConfig> => {
  const config = await getConfig();

  Object.assign(config, updates);
  config.updatedBy = updatedBy as any;
  await config.save();

  // 🔥 clear cache so new values apply
  cachedConfig = null;

  return config;
};