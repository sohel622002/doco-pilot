#!/bin/sh
set -e

SOCK="${DOCKER_SOCKET:-/var/run/docker.sock}"

# Match the socket's group so the non-root user can talk to Docker.
# Linux hosts usually use the docker group (often GID 999); Docker Desktop
# exposes the socket as root:root (GID 0) with mode 660.
if [ -S "$SOCK" ]; then
  SOCK_GID="$(stat -c '%g' "$SOCK")"
  GROUP="$(getent group "$SOCK_GID" | cut -d: -f1)"
  if [ -z "$GROUP" ]; then
    addgroup -g "$SOCK_GID" dockersock
    GROUP=dockersock
  fi
  addgroup appuser "$GROUP" 2>/dev/null || true
fi

exec su-exec appuser "$@"
