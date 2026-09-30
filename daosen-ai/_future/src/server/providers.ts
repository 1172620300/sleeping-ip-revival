export type ProviderTaskType = "DESIGN" | "IMAGE" | "VIDEO";
export type ProviderInput = Record<string, unknown> & { prompt?: string; mode?: string; simulateFailure?: boolean; count?: number; outputKind?: string };
export type ProviderOutput = { analysis?: string[]; brief?: string; prompt?: string; outputs: Array<{ url: string; kind: "IMAGE" | "VIDEO"; label: string }>; mock: true };
export interface LLMProvider { analyze(input: ProviderInput): Promise<Pick<ProviderOutput, "analysis" | "brief" | "prompt">>; }
export interface ImageProvider { generate(input: ProviderInput): Promise<Pick<ProviderOutput, "outputs">>; }
export interface VideoProvider { generate(input: ProviderInput): Promise<Pick<ProviderOutput, "outputs">>; }
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
function slug(input: ProviderInput) { return String(input.prompt ?? input.purpose ?? "concept").slice(0, 32).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "concept"; }
export class MockLLMProvider implements LLMProvider {
  async analyze(input: ProviderInput) {
    await wait(350);
    return {
      analysis: ["形态以清晰轮廓为主，适合继续做材质和比例实验。", "当前判断基于上传素材的可见信息，内部结构与制造可行性仍需工程复核。"],
      brief: `围绕“${String(input.purpose ?? "日常使用") }”建立克制、耐用且易于识别的产品方向。`,
      prompt: `${String(input.appearance ?? "干净几何轮廓") }，${String(input.brand ?? "道森品牌克制表达") }，${String(input.constraints ?? "保留核心识别特征") }，工业设计概念图。`
    };
  }
}
export class MockImageProvider implements ImageProvider {
  async generate(input: ProviderInput) {
    await wait(Number(process.env.MOCK_TASK_DELAY_MS ?? 1200));
    const n = Math.max(1, Math.min(4, Number(input.count ?? 2)));
    const s = slug(input);
    return { outputs: Array.from({ length: n }, (_, i) => ({ url: `/demo/generated-${s}-${i + 1}.svg`, kind: "IMAGE" as const, label: `概念方案 ${String.fromCharCode(65 + i)}` })) };
  }
}
export class MockVideoProvider implements VideoProvider {
  async generate(input: ProviderInput) {
    await wait(Number(process.env.MOCK_TASK_DELAY_MS ?? 1200));
    // There is intentionally no fake video payload in G1. Enable this only when
    // a verified playable provider output is supplied by the deployment.
    if (input.simulateFailure || process.env.MOCK_VIDEO_SUCCESS !== "true") throw new Error("Mock Provider 未配置可播放的视频编码器，任务未生成假结果");
    return { outputs: [{ url: "/demo/marketing-sample.webm", kind: "VIDEO" as const, label: "营销短视频样例（Mock）" }] };
  }
}
export const providers = { llm: new MockLLMProvider(), image: new MockImageProvider(), video: new MockVideoProvider() };
