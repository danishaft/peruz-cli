export function isDomainOrSubdomain(domain: string | undefined, expectedDomain: string): boolean {
  if (!domain) return false;
  const normalized = domain.replace(/^\./, "").toLowerCase();
  const expected = expectedDomain.toLowerCase();
  return normalized === expected || normalized.endsWith(`.${expected}`);
}
