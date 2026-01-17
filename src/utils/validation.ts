import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Geçerli bir e-posta adresi giriniz')

export const passwordSchema = z.string().min(6, 'Şifre en az 6 karakter olmalıdır')

export const requiredString = z.string().min(1, 'Bu alan zorunludur')

export const positiveNumber = z.number().positive('Pozitif bir sayı giriniz')

export const nonNegativeNumber = z.number().min(0, '0 veya daha büyük bir sayı giriniz')

export const percentageNumber = z.number().min(0, 'En az 0 olmalı').max(100, 'En fazla 100 olabilir')

// Form validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifre giriniz')
})

export const userFormSchema = z.object({
  name: requiredString,
  email: emailSchema,
  password: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  status: z.enum(['active', 'inactive'])
})

export const partyFormSchema = z.object({
  type: z.enum(['customer', 'vendor', 'other']),
  name: requiredString,
  tax_no: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçerli bir e-posta adresi giriniz').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional()
})

export const categoryFormSchema = z.object({
  name: requiredString,
  type: z.enum(['income', 'expense']),
  parent_id: z.number().nullable(),
  is_active: z.boolean()
})

export const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  party_id: z.number().nullable(),
  category_id: z.number().nullable(),
  project_id: z.number().nullable(),
  milestone_id: z.number().nullable(),
  date: requiredString,
  amount: positiveNumber,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  vat_rate: percentageNumber,
  withholding_rate: percentageNumber,
  description: z.string().optional(),
  ref_no: z.string().optional()
})

export const debtFormSchema = z.object({
  kind: z.enum(['debt', 'receivable']),
  party_id: z.number().positive('Taraf seçiniz'),
  principal_amount: positiveNumber,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  vat_rate: percentageNumber,
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional()
})

export const projectFormSchema = z.object({
  party_id: z.number().positive('Müşteri seçiniz'),
  title: requiredString,
  contract_amount: nonNegativeNumber,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled', 'on_hold']),
  notes: z.string().optional()
})

export const milestoneFormSchema = z.object({
  project_id: z.number().positive(),
  title: requiredString,
  expected_date: z.string().optional(),
  expected_amount: nonNegativeNumber,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional()
})

export const installmentFormSchema = z.object({
  debt_id: z.number().positive(),
  due_date: requiredString,
  amount: positiveNumber,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  notes: z.string().optional()
})

export const paymentFormSchema = z.object({
  amount: positiveNumber,
  date: requiredString,
  method: z.enum(['cash', 'bank', 'card', 'other']),
  notes: z.string().optional()
})

export const exchangeRateFormSchema = z.object({
  rate_date: requiredString,
  quote_currency: z.enum(['USD', 'EUR']),
  rate: positiveNumber
})

// Helper function to validate and get errors
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      for (const issue of error.issues) {
        const path = issue.path.join('.')
        errors[path] = issue.message
      }
      return { success: false, errors }
    }
    return { success: false, errors: { _: 'Doğrulama hatası' } }
  }
}
