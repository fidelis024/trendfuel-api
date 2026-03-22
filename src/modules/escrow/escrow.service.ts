import mongoose from 'mongoose';
import { Escrow, EscrowStatus } from '../../schemas/mongoose/escrow.model';
import { Wallet, WalletType } from '../../schemas/mongoose/wallet.model';
import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  PaymentGateway,
} from '../../schemas/mongoose/transaction.model';
import { ApiError } from '../../utils/ApiError';
import { v4 as uuidv4 } from 'uuid';

// ─── Hold Funds ───────────────────────────────────────────────────────────────
// Called when order is placed — debit buyer wallet, create escrow

export const holdFunds = async (
  session: mongoose.ClientSession,
  orderId: string,
  buyerId: string,
  amount: number
): Promise<void> => {
  const wallet = await Wallet.findOne({ userId: buyerId }).session(session);
  if (!wallet) throw ApiError.badRequest('Wallet not found. Please contact support.');
  if (wallet.balance < amount) throw ApiError.badRequest('Insufficient wallet balance');

  // Debit buyer wallet
  wallet.balance -= amount;
  await wallet.save({ session });

  // Create escrow record
  await Escrow.create([{ orderId, amount, status: EscrowStatus.HELD }], { session });

  // Log transaction
  await Transaction.create(
    [
      {
        walletId: wallet._id,
        userId: buyerId,
        type: TransactionType.ORDER_DEBIT,
        amount,
        direction: TransactionDirection.DEBIT,
        status: TransactionStatus.COMPLETED,
        reference: `order-debit-${orderId}-${uuidv4()}`,
        relatedOrderId: new mongoose.Types.ObjectId(orderId),
        gateway: PaymentGateway.INTERNAL,
        description: 'Order payment held in escrow',
      },
    ],
    { session }
  );
};

// ─── Release Funds ────────────────────────────────────────────────────────────
// Called when order completes — release escrow to seller wallet

export const releaseFunds = async (
  session: mongoose.ClientSession,
  orderId: string,
  sellerId: string,
  sellerEarnings: number,
  platformFee: number
): Promise<void> => {
  const escrow = await Escrow.findOne({ orderId }).session(session);
  if (!escrow) throw ApiError.notFound('Escrow not found');
  if (escrow.status !== EscrowStatus.HELD) {
    throw ApiError.badRequest('Escrow is not in a held state');
  }

  // Get or create seller wallet
  let sellerWallet = await Wallet.findOne({ userId: sellerId }).session(session);
  if (!sellerWallet) {
    const created = await Wallet.create([{ userId: sellerId, type: WalletType.SELLER }], {
      session,
    });
    sellerWallet = created[0];
  }

  // Credit seller — goes to clearedBalance (available to withdraw)
  sellerWallet.clearedBalance += sellerEarnings;
  sellerWallet.lifetimeEarnings += sellerEarnings;
  await sellerWallet.save({ session });

  // Update escrow
  escrow.status = EscrowStatus.RELEASED;
  escrow.releasedAmount = sellerEarnings;
  escrow.releasedAt = new Date();
  await escrow.save({ session });

  // Log escrow release transaction
  await Transaction.create(
    [
      {
        walletId: sellerWallet._id,
        userId: sellerId,
        type: TransactionType.ESCROW_RELEASE,
        amount: sellerEarnings,
        direction: TransactionDirection.CREDIT,
        status: TransactionStatus.COMPLETED,
        reference: `escrow-release-${orderId}-${uuidv4()}`,
        relatedOrderId: new mongoose.Types.ObjectId(orderId),
        gateway: PaymentGateway.INTERNAL,
        description: 'Escrow released after order completion',
      },
    ],
    { session }
  );
};

// ─── Refund Funds ─────────────────────────────────────────────────────────────
// Called when order is cancelled — refund escrow back to buyer

export const refundFunds = async (
  session: mongoose.ClientSession,
  orderId: string,
  buyerId: string,
  amount: number
): Promise<void> => {
  const escrow = await Escrow.findOne({ orderId }).session(session);
  if (!escrow) throw ApiError.notFound('Escrow not found');
  if (escrow.status !== EscrowStatus.HELD) {
    throw ApiError.badRequest('Escrow is not in a held state');
  }

  const buyerWallet = await Wallet.findOne({ userId: buyerId }).session(session);
  if (!buyerWallet) throw ApiError.notFound('Buyer wallet not found');

  // Refund buyer wallet
  buyerWallet.balance += amount;
  await buyerWallet.save({ session });

  // Update escrow
  escrow.status = EscrowStatus.REFUNDED;
  escrow.refundedAmount = amount;
  await escrow.save({ session });

  // Log refund transaction
  await Transaction.create(
    [
      {
        walletId: buyerWallet._id,
        userId: buyerId,
        type: TransactionType.REFUND,
        amount,
        direction: TransactionDirection.CREDIT,
        status: TransactionStatus.COMPLETED,
        reference: `refund-${orderId}-${uuidv4()}`,
        relatedOrderId: new mongoose.Types.ObjectId(orderId),
        gateway: PaymentGateway.INTERNAL,
        description: 'Order cancelled — refunded to buyer wallet',
      },
    ],
    { session }
  );
};
