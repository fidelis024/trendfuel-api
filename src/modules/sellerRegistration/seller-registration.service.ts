import mongoose from 'mongoose';
import { Wallet } from '../../schemas/mongoose/wallet.model';
import { User } from '../../schemas/mongoose/user.model';
import { Transaction } from '../../schemas/mongoose/transaction.model';
import { SellerKYC } from '../../schemas/mongoose/sellerKyc.model';
import { ApiError } from '../../utils/ApiError';
const SELLER_FEE_KOBO = 30;

// ─── Step 1: Pay seller registration fee from wallet ─────────────────────────
export const paySellerFee = async (userId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();


  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new ApiError(404, 'User not found');

    // Role guards
    if (['seller', 'admin', 'super_admin'].includes(user.role)) {
      throw new ApiError(400, 'You already have seller or admin privileges');
    }

    // Check if fee already paid
    if (user.sellerProfile?.accessFeePaid) {
      throw new ApiError(400, 'Registration fee already paid. Please proceed to submit your KYC');
    }

    // Wallet check
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    if (wallet.balance < SELLER_FEE_KOBO) {
      const shortfall = ((SELLER_FEE_KOBO - wallet.balance) / 100).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
      });
      throw new ApiError(
        402,
        `Insufficient wallet balance. Please top up ₦${shortfall} to proceed`
      );
    }

    // Deduct fee
    wallet.balance -= SELLER_FEE_KOBO;
    await wallet.save({ session });

    // Record transaction
    await Transaction.create(
      [
        {
          walletId: wallet._id, // ✅ REQUIRED
          userId: user._id,

          type: 'seller_access_fee', // ✅ FIXED ENUM
          amount: SELLER_FEE_KOBO,

          direction: 'debit', // ✅ REQUIRED (money leaving wallet)

          status: 'completed',

          reference: `SELLER-REG-${userId}-${Date.now()}`,

          gateway: 'internal', // ✅ since wallet deduction
          gatewayMeta: {},

          description: 'One-time seller registration fee',
        },
      ],
      { session }
    );

    // Initialize sellerProfile with fee paid
    user.sellerProfile = {
      bio: '',
      country: '',
      niche: '',
      level: 'new' as any,
      badge: null,
      applicationStatus: 'pending',
      accessFeePaid: true,
      agreementAccepted: false,
      agreementAcceptedAt: null,
    };

    await user.save({ session });
    await session.commitTransaction();

    return {
      message: 'Registration fee paid successfully. Please proceed to submit your KYC details.',
      feePaid: true,
      amountDeducted: SELLER_FEE_KOBO,
      walletBalance: wallet.balance,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Step 2: Submit KYC ───────────────────────────────────────────────────────
export const submitKYC = async (
  userId: string,
  data: {
    fullName: string;
    nin: string;
    dateOfBirth: string;
    phone: string;
    streetAddress: string;
    city: string;
  }
) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Must have paid fee first
  if (!user.sellerProfile?.accessFeePaid) {
    throw new ApiError(400, 'Please complete the registration fee payment before submitting KYC');
  }

  // Already approved
  if (user.sellerProfile.applicationStatus === 'approved') {
    throw new ApiError(400, 'Your seller application has already been approved');
  }

  // Check for existing KYC — allow resubmission only if rejected
  const existingKYC = await SellerKYC.findOne({ userId });
  if (existingKYC) {
    if (existingKYC.status === 'pending') {
      throw new ApiError(400, 'Your KYC is already under review. Please wait for admin approval');
    }
    if (existingKYC.status === 'approved') {
      throw new ApiError(400, 'Your KYC has already been approved');
    }
    // Rejected — allow resubmission by updating
    existingKYC.fullName = data.fullName;
    existingKYC.nin = data.nin;
    existingKYC.dateOfBirth = new Date(data.dateOfBirth);
    existingKYC.phone = data.phone;
    existingKYC.streetAddress = data.streetAddress;
    existingKYC.city = data.city;
    existingKYC.status = 'pending';
    existingKYC.rejectionReason = null;
    existingKYC.reviewedBy = null;
    existingKYC.reviewedAt = null;
    await existingKYC.save();

    // Reset applicationStatus to pending
    user.sellerProfile.applicationStatus = 'pending';
    await user.save();

    return {
      message: 'KYC resubmitted successfully. Your application is under review.',
      kycStatus: 'pending',
    };
  }

  // Fresh KYC submission
  await SellerKYC.create({
    userId,
    fullName: data.fullName,
    nin: data.nin,
    dateOfBirth: new Date(data.dateOfBirth),
    phone: data.phone,
    streetAddress: data.streetAddress,
    city: data.city,
    status: 'pending',
  });

  return {
    message: 'KYC submitted successfully. Your application is under review (24–48 hours).',
    kycStatus: 'pending',
  };
};

// ─── Check registration status ────────────────────────────────────────────────
export const getRegistrationStatus = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const kyc = await SellerKYC.findOne({ userId }).select(
    'status rejectionReason createdAt updatedAt'
  );

  return {
    role: user.role,
    accessFeePaid: user.sellerProfile?.accessFeePaid ?? false,
    applicationStatus: user.sellerProfile?.applicationStatus ?? null,
    kyc: kyc
      ? {
          status: kyc.status,
          rejectionReason: kyc.rejectionReason,
          submittedAt: kyc.createdAt,
          reviewedAt: kyc.updatedAt,
        }
      : null,
  };
};
