const ROLE_RANK = { viewer: 1, operator: 2, owner: 3 };

// `role` is undefined while the servers list is still loading — treat that
// as "not enough to act yet" rather than crashing, so a page always renders
// safely on first paint.
export function hasRole(role, minRole) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function canWrite(role) {
  return hasRole(role, "operator");
}

export function isOwner(role) {
  return hasRole(role, "owner");
}
