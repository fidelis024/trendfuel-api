import mongoose, { Document, Schema } from 'mongoose';

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  X = 'x',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  SNAPCHAT = 'snapchat',
  SPOTIFY = 'spotify',
  TELEGRAM = 'telegram',
  OTHER = 'other',
}

export interface ICategory extends Document {
  platform: SocialPlatform;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    platform: {
      type: String,
      enum: Object.values(SocialPlatform),
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ platform: 1, isActive: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);