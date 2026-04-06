import { PlatformConfig, IPlatformConfig } from '../schemas/mongoose/platformconfig.model';

// ─── Get Config (singleton — always one document) ─────────────────────────────

export const getConfig = async (): Promise<IPlatformConfig> => {
  let config = await PlatformConfig.findOne();

  // Seed default config on first run
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

  return config;
};

// ─── Update Config (super_admin only) ────────────────────────────────────────

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

  return config;
};
