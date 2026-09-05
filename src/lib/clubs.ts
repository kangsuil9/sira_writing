export function isWritingOpen(
  status: string,
  startsAt?: string,
  endsAt?: string,
  now = new Date(),
) {
  if (status !== "ACTIVE" || !startsAt || !endsAt) return false;
  return now >= new Date(startsAt) && now <= new Date(endsAt);
}
