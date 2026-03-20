// sellers/seller.service.ts
import Seller, { ISeller } from '../../schemas/mongoose/seller.model';
import { ApiError } from '../../utils/ApiError';

export class SellerService {
  async createSeller(userId: string, businessName: string): Promise<ISeller> {
    const seller = new Seller({ userId, businessName });
    await seller.save();
    return seller;
  }

  async getSellerByUserId(userId: string): Promise<ISeller> {
    const seller = await Seller.findOne({ userId });
    if (!seller) throw new ApiError(404, 'Seller profile not found');
    return seller;
  }
}

export default new SellerService();
