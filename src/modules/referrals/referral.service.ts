// referrals/referral.service.ts
import Referral, { IReferral } from '../../schemas/mongoose/referral.model';

export class ReferralService {
  async createReferral(referrerId: string, refereeId: string): Promise<IReferral> {
    const referral = new Referral({ referrerId, refereeId, reward: 100 });
    await referral.save();
    return referral;
  }

  async getReferrals(referrerId: string): Promise<IReferral[]> {
    return Referral.find({ referrerId });
  }
}

export default new ReferralService();
