import { writerPrompt, type WriterContext, type WriterStage } from './prompts/writer';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'AI 服务连接失败，请稍后重试。');
  return body as T;
}

export async function listWriterModels() { return request<{ models: string[]; textModels: string[]; videoModels: string[]; configuredTextModel: string | null }>('/api/ai/models'); }
export async function generateWriterStage(stage: WriterStage, context: WriterContext, model?: string) {
  const response = await fetch('/api/ai/writer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stage, model, context, prompt: writerPrompt(stage, context) }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'AI 服务连接失败，请稍后重试。');
  if (!body.result || typeof body.result !== 'object') throw new Error('模型返回格式异常，请重新生成。');
  return body.result as Record<string, unknown>;
}
