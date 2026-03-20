// disputes/dispute.service.ts
import Dispute, { IDispute } from '../../schemas/mongoose/dispute.model';

export class DisputeService {
  async createDispute(disputeData: any): Promise<IDispute> {
    const dispute = new Dispute(disputeData);
    await dispute.save();
    return dispute;
  }

  async resolveDispute(disputeId: string, resolution: string): Promise<IDispute> {
    return Dispute.findByIdAndUpdate(
      disputeId,
      { status: 'resolved', resolution },
      { new: true }
    ) as Promise<IDispute>;
  }
}

export default new DisputeService();
