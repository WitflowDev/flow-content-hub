export type AccountNotice = {
  id: string
  title: string
  body: string
  createdAt: string
  unread: boolean
}

export type PromotionAudience = 'all' | string

export type PromotionResult = { ok: true } | { ok: false; message: string }
