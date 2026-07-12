export type ForgetTarget = { url: string } | { domain: string };

export function forgetTarget(value: string): ForgetTarget {
  const target = value.trim();
  return target.includes('://') ? { url: target } : { domain: target };
}
