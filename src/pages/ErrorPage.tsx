import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'

export default function ErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'Something went wrong.'

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink">
      <p className="text-5xl">{notFound ? '🧩' : '⚠️'}</p>
      <h1 className="font-display text-xl font-extrabold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="max-w-xs text-sm text-ink-muted">
        {notFound ? "That page doesn't exist — it may have been a bad link." : message}
      </p>
      <Link to="/" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
        Back home
      </Link>
    </main>
  )
}
