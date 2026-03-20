// payments/payment.service.ts
import Payment, { IPayment } from './payment.model';

export class PaymentService {
  async createPayment(paymentData: any): Promise<IPayment> {
    const payment = new Payment(paymentData);
    await payment.save();
    return payment;
  }

  async getPayment(paymentId: string): Promise<IPayment> {
    return Payment.findById(paymentId) as Promise<IPayment>;
  }
}

export default new PaymentService();
