import { z } from 'zod';
import { ALL_ROLES } from '@/types';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createApplicationSchema = z.object({
  institutionName: z
    .string()
    .min(2, 'Institution name is required')
    .max(255, 'Maximum 255 characters'),
  licenseType: z.string().min(1, 'Select a license type').max(64),
  description: z.string().max(4000, 'Maximum 4000 characters').optional().or(z.literal('')),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const createLicenseTypeSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(64, 'Maximum 64 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Use letters, digits, or underscores only'),
  label: z.string().min(2, 'Label is required').max(255, 'Maximum 255 characters'),
});

export type CreateLicenseTypeInput = z.infer<typeof createLicenseTypeSchema>;

export const reviewerFollowUpSchema = z.object({
  reviewerNotes: z
    .string()
    .min(5, 'Please describe what additional information is needed (at least 5 characters)')
    .max(4000),
});

export type ReviewerFollowUpFormValues = z.infer<typeof reviewerFollowUpSchema>;

export const submitReviewSchema = z.object({
  recommendation: z.enum(['RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION']),
  reviewerNotes: z.string().max(4000).optional().or(z.literal('')),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const finalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  decisionNotes: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(5, 'A written reason is required for the final decision')
        .max(4000, 'Maximum 4000 characters'),
    ),
});

export type FinalDecisionInput = z.infer<typeof finalDecisionSchema>;

export const resubmitSchema = z.object({
  applicantNotes: z.string().max(4000).optional().or(z.literal('')),
});

export type ResubmitInput = z.infer<typeof resubmitSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  role: z.enum(ALL_ROLES as unknown as [string, ...string[]]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
