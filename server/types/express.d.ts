export interface AuthUser {
  id: string
  email: string
  name?: string
  ip?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
