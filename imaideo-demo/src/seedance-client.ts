export interface SeedanceModelResponse { models: string[]; discoveredModels: string[]; configuredModel: string | null; configuredOnly: boolean; }
export interface SeedanceTask { taskId: string; status: string; videoUrl?: string | null; error?: unknown; }
async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Seedance 服务请求失败（${response.status}）`);
  return body as T;
}
export function seedanceStatus() { return request<{ configured: boolean; configuredModel: string | null }>('/api/seedance/status'); }
export function listSeedanceModels() { return request<SeedanceModelResponse>('/api/seedance/models'); }
export function submitSeedanceVideo(model: string, prompt: string) { return request<SeedanceTask>('/api/seedance/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt }) }); }
export function getSeedanceVideo(taskId: string) { return request<SeedanceTask>(`/api/seedance/videos/${encodeURIComponent(taskId)}`); }
