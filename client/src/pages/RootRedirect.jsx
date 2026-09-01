import { Navigate } from 'react-router-dom'
import { useServers } from '../hooks/useServers'

export default function RootRedirect() {
  const { data, isLoading } = useServers()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface-variant font-body-main text-body-main">
        Loading…
      </div>
    )
  }

  const firstServer = data?.servers?.[0]

  // no servers
  if (!firstServer) {
    return <Navigate to="/servers" replace />
  }

  return (
    <Navigate
      to={`/${firstServer.id}`}
      replace
    />
  )
}