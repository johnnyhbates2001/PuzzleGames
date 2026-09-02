import type { Env } from '../types'

export interface RouteContext {
  request: Request
  env: Env
  url: URL
  params: Record<string, string>
}

export type Handler = (ctx: RouteContext) => Promise<Response> | Response

interface Route {
  method: string
  segments: string[]
  handler: Handler
}

/** Small dependency-free router — exact segments or `:param` segments, no
 *  wildcards/regex, which is all this API's routes need. */
export class Router {
  private routes: Route[] = []

  private add(method: string, pattern: string, handler: Handler) {
    this.routes.push({ method, segments: pattern.split('/').filter(Boolean), handler })
  }

  get(pattern: string, handler: Handler) {
    this.add('GET', pattern, handler)
  }
  post(pattern: string, handler: Handler) {
    this.add('POST', pattern, handler)
  }
  patch(pattern: string, handler: Handler) {
    this.add('PATCH', pattern, handler)
  }
  delete(pattern: string, handler: Handler) {
    this.add('DELETE', pattern, handler)
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
    const segments = pathname.split('/').filter(Boolean)
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== segments.length) continue
      const params: Record<string, string> = {}
      let matched = true
      for (let i = 0; i < segments.length; i++) {
        const routeSegment = route.segments[i]
        if (routeSegment.startsWith(':')) {
          params[routeSegment.slice(1)] = decodeURIComponent(segments[i])
        } else if (routeSegment !== segments[i]) {
          matched = false
          break
        }
      }
      if (matched) return { handler: route.handler, params }
    }
    return null
  }
}
