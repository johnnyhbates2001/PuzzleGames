export interface Env {
  DB: D1Database
}

export interface UserRow {
  id: string
  username: string
  password_hash: string
  password_salt: string
  recovery_code_hash: string
  avatar_type: string
  avatar_value: string
  created_at: number
}

/** The subset of a user row that's ever safe to send to a client — never the
 *  password/recovery hashes. */
export interface PublicUser {
  id: string
  username: string
  avatarType: string
  avatarValue: string
}

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, username: row.username, avatarType: row.avatar_type, avatarValue: row.avatar_value }
}
