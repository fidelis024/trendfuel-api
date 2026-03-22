import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  BUYER = 'buyer',
  SELLER = 'seller',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING = 'pending',
}

export enum SellerLevel {
  NEW = 'new',
  RISING = 'rising',
  TOP = 'top',
  PRO = 'pro',
}

export interface ITwoFA {
  secret: string;
  enabled: boolean;
  backupCodes: string[];
}

export interface ISellerProfile {
  bio: string;
  country: string;
  niche: string;
  level: SellerLevel;
  badge: string | null;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  accessFeePaid: boolean;
  agreementAccepted: boolean;
  agreementAcceptedAt: Date | null;
}

export interface ISellerMetrics {
  completionRate: number;
  disputeRate: number;
  avgRating: number;
  totalOrders: number;
  totalEarnings: number;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  refreshToken: string | null;
  refreshTokenExpires: Date | null;
  twoFA: ITwoFA;
  sellerProfile: ISellerProfile | null;
  sellerMetrics: ISellerMetrics | null;
  referralCode: string;
  referredBy: mongoose.Types.ObjectId | null;
  ipAddress: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  isActive(): boolean;
  fullName(): string;
}

const TwoFASchema = new Schema<ITwoFA>(
  {
    secret: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    backupCodes: { type: [String], default: [] },
  },
  { _id: false }
);

const SellerProfileSchema = new Schema<ISellerProfile>(
  {
    bio: { type: String, default: '' },
    country: { type: String, default: '' },
    niche: { type: String, default: '' },
    level: { type: String, enum: Object.values(SellerLevel), default: SellerLevel.NEW },
    badge: { type: String, default: null },
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    accessFeePaid: { type: Boolean, default: false },
    agreementAccepted: { type: Boolean, default: false },
    agreementAcceptedAt: { type: Date, default: null },
  },
  { _id: false }
);

const SellerMetricsSchema = new Schema<ISellerMetrics>(
  {
    completionRate: { type: Number, default: 100, min: 0, max: 100 },
    disputeRate: { type: Number, default: 0, min: 0, max: 100 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.BUYER },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null, select: false },
    emailVerifyExpires: { type: Date, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    refreshToken: { type: String, default: null, select: false },
    refreshTokenExpires: { type: Date, default: null, select: false },
    twoFA: {
      type: TwoFASchema,
      default: () => ({ secret: '', enabled: false, backupCodes: [] }),
    },
    sellerProfile: { type: SellerProfileSchema, default: null },
    sellerMetrics: { type: SellerMetricsSchema, default: null },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ipAddress: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ 'sellerProfile.applicationStatus': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ firstName: 1, lastName: 1 }); // for admin user search

UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.isActive = function (): boolean {
  return this.status === UserStatus.ACTIVE;
};

UserSchema.methods.fullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    delete r['passwordHash'];
    delete r['emailVerifyToken'];
    delete r['emailVerifyExpires'];
    delete r['passwordResetToken'];
    delete r['passwordResetExpires'];
    delete r['refreshToken'];
    delete r['refreshTokenExpires'];
    if (r['twoFA']) {
      const twoFA = r['twoFA'] as Record<string, unknown>;
      delete twoFA['secret'];
      delete twoFA['backupCodes'];
    }
    return r;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
