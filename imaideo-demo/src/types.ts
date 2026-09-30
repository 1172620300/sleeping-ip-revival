export type Role = 'creator' | 'owner';
export type ProjectStatus = 'draft' | 'producing' | 'review' | 'changes' | 'selected';
export type ClipStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed';
export type IpCategory = '童年经典' | '国漫动画' | '游戏世界' | '国际 IP';
export interface IP { id: string; title: string; subtitle: string; description: string; genre: string; format: string; available: boolean; cover: string; color: string; owner: string; rules: string; world: string; category: IpCategory; featured: boolean; demoOnly: boolean; sortOrder: number; }
export interface Asset { id: string; ipId: string; name: string; kind: '角色' | '场景' | '道具'; description: string; version: string; source: 'ip' | 'personal'; cover: string; frame?: number; }
export interface Commission { id: string; ipId: string; title: string; brief: string; format: string; seconds: number; deadline: string; reward: string; rules: string; assetIds: string[]; criteria: string; }
export interface Shot { id: string; title: string; description: string; dialogue: string; duration: number; camera: string; assetIds: string[]; frame: number; clipStatus: ClipStatus; selected: boolean; failOnce: boolean; framing?: string; action?: string; tone?: string; sound?: string; continuity?: string; videoProvider?: 'demo' | 'seedance'; videoTaskId?: string; videoUrl?: string; videoError?: string; }
export interface Script { idea: string; format: string; synopsis: string; characters: string; body: string; confirmedBody: string; revision: number; }
export interface Position { x: number; y: number; }
export interface Project { id: string; title: string; ipId: string; taskId: string; status: ProjectStatus; updatedAt: string; script: Script; assetIds: string[]; assetNotes: string; shots: Shot[]; canvas: Record<string, Position>; zoom: number; submission: { title: string; summary: string; author: string; note: string }; assistant?: AssistantData; }
export interface AssistantCheck { id: string; status: 'pass' | 'fix' | 'manual'; label: string; location: string; }
export interface AssistantData {
  schema: 1; enabled: boolean; planning: string; outline: string; ledger: string; style: string;
  versions: { revision: number; confirmedAt: string; signature: string; script: Script; planning: string; outline: string; ledger: string }[];
  assetLock?: { signature: string; assets: Asset[] };
  storyboardBasis: string;
  config: { ratio: '16:9' | '9:16' | '21:9'; transition: '换机位衔接' | '末态延续' | '空镜过渡'; template: '通用' | 'Seedance' | 'H3' };
  prompts: Record<string, string>; promptBasis: string;
  checkReport?: { at: string; basis: string; items: AssistantCheck[] };
  writerCheckReport?: { at: string; basis: string; items: AssistantCheck[] };
  directorCheckReport?: { at: string; basis: string; items: AssistantCheck[] };
  storyPlan?: string;
  characterData?: string;
  outlineData?: string;
  scriptReview?: string;
}
export interface ReviewNote { id: string; shotId: string; text: string; createdAt: string; }
export interface Submission { id: string; projectId: string; taskId: string; version: number; snapshot: Project; context: { ip: IP; assets: Asset[]; task: Commission }; submittedAt: string; status: 'pending' | 'changes' | 'selected'; notes: ReviewNote[]; }
export interface DemoState { schema: 1; role: Role; ips: IP[]; assets: Asset[]; tasks: Commission[]; projects: Project[]; submissions: Submission[]; }
