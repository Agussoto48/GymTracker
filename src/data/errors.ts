/** Input broke a rule; `errors` maps field names to messages for the form. */
export class ValidationError extends Error {
  readonly errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.errors = errors
  }
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} not found: ${id}`)
  }
}
