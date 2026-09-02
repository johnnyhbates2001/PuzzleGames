export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

/** Parses the JSON body of a request, returning null (never throwing) on
 *  malformed/missing input — callers should treat null as a 400. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
