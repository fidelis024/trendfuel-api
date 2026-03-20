// orders/order.service.ts
import Order, { IOrder } from './order.model';
import { ApiError } from '../../utils/ApiError';

export class OrderService {
  async createOrder(orderData: any): Promise<IOrder> {
    const order = new Order(orderData);
    await order.save();
    return order;
  }

  async getOrder(orderId: string): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<IOrder> {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  }
}

export default new OrderService();
