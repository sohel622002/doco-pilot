import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

// Generic zod request-body validator. On failure returns a 400 with the first issue message.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request body' })
    }

    req.body = result.data
    next()
  }
}
