import { z } from 'zod';

const countrySchema = z
  .string()
  .length(2, 'country debe ser código ISO de 2 letras (ej. CO)')
  .optional();

export const analyzeBodySchema = z.object({
  contractId: z.string().min(1, 'contractId es requerido'),
  country: countrySchema,
  contractTypeId: z.string().min(1).optional(),
});

export const risksBodySchema = z.object({
  contractId: z.string().min(1, 'contractId es requerido'),
  country: countrySchema,
  contractTypeId: z.string().min(1).optional(),
});

export const compareBodySchema = z
  .object({
    contractIdA: z.string().min(1, 'contractIdA es requerido'),
    contractIdB: z.string().min(1, 'contractIdB es requerido'),
    country: countrySchema,
    contractTypeId: z.string().min(1).optional(),
  })
  .refine((d) => d.contractIdA !== d.contractIdB, {
    message: 'Los dos contratos deben ser distintos',
  });

export type AnalyzeBody = z.infer<typeof analyzeBodySchema>;
export type RisksBody = z.infer<typeof risksBodySchema>;
export type CompareBody = z.infer<typeof compareBodySchema>;

export const comparisonReviewBodySchema = z.object({
  decision: z.enum(['approved', 'discarded']),
});

export type ComparisonReviewBody = z.infer<typeof comparisonReviewBodySchema>;

export const createContractBodySchema = z.object({
  contractId: z.string().min(1, 'contractId es requerido'),
  title: z.string().min(1, 'title es requerido').max(200),
  fileName: z.string().min(1, 'fileName es requerido'),
  storagePath: z.string().min(1, 'storagePath es requerido'),
  fileSizeBytes: z.number().int().positive().optional(),
  country: countrySchema,
  contractTypeId: z.string().min(1).optional(),
});

export type CreateContractBody = z.infer<typeof createContractBodySchema>;
