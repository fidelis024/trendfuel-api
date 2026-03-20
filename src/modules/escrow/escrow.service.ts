// escrow/escrow.service.ts
import Escrow, { IEscrow } from '../../schemas/mongoose/escrow.model';

export class EscrowService {
  async holdFunds(orderId: string, amount: number, holdDays: number): Promise<IEscrow> {
    const holdReleaseDate = new Date();
    holdReleaseDate.setDate(holdReleaseDate.getDate() + holdDays);

    const escrow = new Escrow({ orderId, amount, holdReleaseDate });
    await escrow.save();
    return escrow;
  }

  async releaseFunds(orderId: string): Promise<IEscrow> {
    return Escrow.findOneAndUpdate(
      { orderId },
      { status: 'released' },
      { new: true }
    ) as Promise<IEscrow>;
  }
}

export default new EscrowService();
