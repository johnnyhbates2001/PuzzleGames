const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/

export function isValidUsername(username: unknown): username is string {
  return typeof username === 'string' && USERNAME_PATTERN.test(username)
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200
}
