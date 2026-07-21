import { governance } from '@/lib/governedPriorAuth';

export class ProviderDeliveryError extends Error {
  constructor(message: string, public retryable: boolean) { super(message); }
}

type Job = { provider: string; operation: string; payload: Record<string, unknown>; idempotency_key: string };

function providerConfiguration(provider: string) {
  const prefix = provider.toUpperCase();
  const base = process.env[`${prefix}_BASE_URL`];
  const token = process.env[`${prefix}_ACCESS_TOKEN`];
  if (!base || !token) throw new ProviderDeliveryError(`${provider} is not configured`, false);
  const baseUrl = new URL(base);
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') throw new ProviderDeliveryError(`${provider} must use HTTPS`, false);
  if (!['https:', 'http:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new ProviderDeliveryError(`${provider} endpoint is invalid`, false);
  if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/';
  return { baseUrl, token, timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 10000) };
}

export async function deliver(job: Job, fetchImplementation: typeof fetch = fetch) {
  governance.providerJob(job.provider, job.operation, job.payload, job.idempotency_key);
  const config = providerConfiguration(job.provider);
  const url = new URL(`operations/${encodeURIComponent(job.operation)}`, config.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImplementation(url, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json', accept: 'application/json', 'idempotency-key': job.idempotency_key },
      body: JSON.stringify(job.payload),
    });
    if (!response.ok) throw new ProviderDeliveryError(`provider returned ${response.status}`, response.status === 408 || response.status === 429 || response.status >= 500);
    if (!String(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new ProviderDeliveryError('provider returned unsupported content type', false);
    const body = await response.json() as Record<string, unknown>;
    const receipt = String(body.receipt || '');
    if (!/^[A-Za-z0-9._:-]{1,200}$/.test(receipt)) throw new ProviderDeliveryError('provider receipt is invalid', false);
    return { receipt };
  } catch (error) {
    if (error instanceof ProviderDeliveryError) throw error;
    throw new ProviderDeliveryError(error instanceof Error ? error.message : 'provider request failed', true);
  } finally { clearTimeout(timer); }
}
