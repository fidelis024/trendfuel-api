import { z } from 'zod';

export const paySellerFeeSchema = z.object({});
// No body — just wallet check

export const submitKYCSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).trim(),
    nin: z
      .string()
      .length(11, 'NIN must be exactly 11 digits')
      .regex(/^\d+$/, 'NIN must contain only numbers'),
    dateOfBirth: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
      .refine(
        (val) => {
          const dob = new Date(val);
          const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          return age >= 18;
        },
        { message: 'You must be at least 18 years old' }
      ),
    phone: z
      .string()
      .min(10)
      .max(20)
      .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'),
    streetAddress: z.string().min(5).max(200).trim(),
    city: z.string().min(2).max(100).trim(),
  }),
});
