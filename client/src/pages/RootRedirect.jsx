import { Navigate } from 'react-router-dom'
import { useServers } from '../hooks/useServers'

export default function RootRedirect() {
  const { data, isLoading } = useServers()

  if (isLoading) {
    return <p>Loading...</p>
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