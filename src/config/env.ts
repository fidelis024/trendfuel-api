import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRE: z.string().default('7d'),
  RESEND_API_KEY: z.string().optional(),
  API_URL: z.string().url(),
  APP_URL: z.string().url(),
  PLATFORM_COMMISSION_RATE: z.coerce.number().default(0.15),
  ORDER_AUTO_COMPLETE_HOURS: z.coerce.number().default(72),
  SELLER_RESPOND_HOURS: z.coerce.number().default(48),
  WITHDRAWAL_DELAY_DAYS: z.coerce.number().default(7),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required'),
});

const env = envSchema.parse(process.env);
export default env;
