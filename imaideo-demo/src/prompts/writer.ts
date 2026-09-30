export type WriterStage = 'planning' | 'characters' | 'outline' | 'script' | 'continuity' | 'review';
export interface WriterContext { idea: string; format: string; synopsis: string; characters: string; planning: string; outline: string; body: string; ledger: string; ipTitle: string; ipRules: string; }

const instructions: Record<WriterStage, string> = {
  planning: '输出故事策划 JSON：title、logline、genre、theme、world、tone、coreConflict、summary。',
  characters: '输出人物设定 JSON：characters 数组；每个人物包含 name、role、age、appearance、personality、background、motivation、conflict、relationship。',
  outline: '输出故事大纲 JSON：outline 数组、acts 数组、keyEvents 数组、ending。必须沿用已给人物和世界观。',
  script: '输出单集剧本 JSON：body 字段。body 必须包含场景、人物、动作和对白，并沿用大纲、人物和连续性。',
  continuity: '输出连续性记录 JSON：characterStates、relationships、props、locations、events、openThreads、timeline。',
  review: '输出剧本检查 JSON：issues 数组，每项包含 severity、type、description、location、suggestion；另含 summary。检查人物名字、关系、时间线、场景、世界观和设定冲突。',
};

export function writerPrompt(stage: WriterStage, context: WriterContext) {
  return `你是专业短剧编剧助手。${instructions[stage]} 只返回合法 JSON，不要 Markdown 代码围栏，不要解释文字。\n\n项目上下文：\n${JSON.stringify(context, null, 2)}`;
}
