import http from 'node:http';
import fs from 'node:fs';

// Keep the key server-side while supporting Node 20 without extra dotenv dependencies.
for (const envUrl of [new URL('../.env', import.meta.url), new URL('./.env', import.meta.url)]) {
  try {
    const envFile = fs.readFileSync(envUrl, 'utf8');
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      // The workspace-level .env is loaded first; project values only fill missing entries.
      if (match && match[2] && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* .env is optional; the status endpoint will explain missing configuration. */ }
}

const port = Number(process.env.API_PORT || 8787);
const baseUrl = String(process.env.CANGYUAN_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.CANGYUAN_API_KEY || '';
const videoBaseUrl = String(process.env.CANGYUAN_VIDEO_BASE_URL || process.env.CANGYUAN_BASE_URL || '').replace(/\/$/, '');
const videoApiKey = process.env.CANGYUAN_VIDEO_API_KEY || process.env.CANGYUAN_API_KEY || '';
const configuredModel = process.env.CANGYUAN_VIDEO_MODEL || process.env.CANGYUAN_SEEDANCE_MODEL || '';
const configuredTextModels = String(process.env.CANGYUAN_TEXT_MODELS || process.env.CANGYUAN_TEXT_MODEL || '').split(',').map(x => x.trim()).filter(Boolean);
const aiBaseUrl = String(process.env.AI_BASE_URL || process.env.CANGYUAN_BASE_URL || '').replace(/\/$/, '');
const aiApiKey = process.env.AI_API_KEY || process.env.CANGYUAN_API_KEY || '';
const aiModel = process.env.AI_MODEL || process.env.CANGYUAN_TEXT_MODEL || configuredTextModels[0] || '';
const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 180000);
const aiProvider = process.env.AI_PROVIDER || (aiApiKey ? 'openai-compatible' : 'mock');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}
function configError(res) {
  return json(res, 503, { error: '未配置沧元算力。请在项目根目录 .env 设置 CANGYUAN_BASE_URL 和 CANGYUAN_API_KEY。' });
}
async function gateway(path, options = {}, credentials = { baseUrl, apiKey }) {
  if (!credentials.baseUrl || !credentials.apiKey) throw new Error('未配置沧元算力。');
  const response = await fetch(`${credentials.baseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${credentials.apiKey}`, 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) { const error = new Error(body?.error?.message || body?.message || `网关请求失败（${response.status}）`); error.status = response.status; throw error; }
  return body;
}
async function readBody(req) {
  let text = ''; for await (const chunk of req) text += chunk;
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new Error('请求内容不是有效 JSON。'); }
}
function parseModelJson(content) {
  const text = String(content || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(text); } catch {
    const start = Math.min(...['{', '['].map(token => { const i = text.indexOf(token); return i < 0 ? Number.MAX_SAFE_INTEGER : i; }));
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (start !== Number.MAX_SAFE_INTEGER && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fall through */ } }
    throw new Error('模型返回格式异常，请重新生成。');
  }
}
function extractChatContent(raw, body) {
  if (typeof body?.choices?.[0]?.message?.content === 'string') return body.choices[0].message.content;
  const chunks = [];
  for (const line of String(raw).split(/\r?\n/)) {
    const data = line.replace(/^data:\s*/, '').trim();
    if (!data || data === '[DONE]') continue;
    try {
      const chunk = JSON.parse(data), delta = chunk.choices?.[0]?.delta;
      if (typeof delta?.content === 'string') chunks.push(delta.content);
      else if (typeof chunk.choices?.[0]?.message?.content === 'string') chunks.push(chunk.choices[0].message.content);
    } catch { /* ignore keep-alive or non-JSON SSE lines */ }
  }
  return chunks.join('');
}
function mockWriter(stage, context) {
  const idea = context.idea || '一个普通人决定重新出发的故事';
  const title = context.ipTitle ? `${context.ipTitle}的新故事` : '未命名的新故事';
  if (stage === 'planning') return { title, logline: idea, genre: '温情奇幻', theme: '在熟悉的世界里重新发现勇气', world: context.ipTitle ? `${context.ipTitle}的世界；遵守：${context.ipRules || '保持世界观一致'}` : '现实与微小奇迹交叠的城市', tone: '克制、温暖、带一点希望', coreConflict: '主角必须在旧规则与新的选择之间做出决定', summary: `${idea}。主角在一次意外中发现改变的机会，并用行动完成一次温柔的选择。` };
  if (stage === 'characters') return { characters: [{ name: '阿遥', role: '主角', age: '22', appearance: '短发，背着旧帆布包', personality: '敏感、可靠、行动力强', background: '在熟悉的地方长大，习惯把心事藏起来', motivation: '完成一件被搁置很久的事', conflict: '害怕改变，却又不愿继续原地停留', relationship: '与林婆婆互相照看' }, { name: '林婆婆', role: '关键人物', age: '68', appearance: '银发，常穿深色外套', personality: '安静、直接、心软', background: '守着一段无人知晓的往事', motivation: '等到一个迟来的回应', conflict: '不愿承认自己仍在等待', relationship: '阿遥的收信人和引路人' }] };
  if (stage === 'outline') return { outline: ['主角在日常任务中发现异常线索', '主角追查线索并遇到关键人物', '旧规则带来阻碍，主角必须做出选择', '线索完成闭环，人物关系发生改变'], acts: ['建立日常与问题', '追查与选择', '抵达与回响'], keyEvents: ['发现线索', '第一次失败', '关键人物说出真相', '完成最终行动'], ending: '主角带着新的理解回到日常，但已经开始主动写下自己的下一封信。' };
  if (stage === 'script') return { body: `场景一｜外景·清晨·${context.ipTitle || '小城'}\n人物：阿遥。\n动作：阿遥停在路口，反复确认手中的旧纸条，终于抬头向山路走去。\n对白：阿遥：这一次，我想亲自送到。\n\n场景二｜内景·午后·旧屋\n人物：阿遥、林婆婆。\n动作：林婆婆没有接过纸条，只把门再打开了一点。\n对白：林婆婆：你知道等一个答案，要多久吗？\n阿遥：不知道，但我已经到了。\n\n场景三｜外景·黄昏·山路\n人物：阿遥、林婆婆。\n动作：两人并肩走向亮起的灯，旧纸条被放进新的信封。\n对白：林婆婆：那就把新的故事写下去。` };
  if (stage === 'continuity') return { characterStates: ['阿遥：从犹豫转为主动', '林婆婆：从等待转为回应'], relationships: ['阿遥与林婆婆：互相照看，逐渐建立信任'], props: ['旧纸条：线索与情感核心', '新信封：完成交接的象征'], locations: ['旧屋：真相揭示地点', '山路：选择与启程地点'], events: ['阿遥发现旧纸条', '阿遥找到林婆婆', '两人完成信件交接'], openThreads: ['旧纸条的来历可在后续故事展开'], timeline: ['清晨发现线索', '午后进入旧屋', '黄昏完成交接'] };
  return { summary: '本地检查未发现结构性冲突。', issues: [] };
}
async function generateWriter(input) {
  const stage = String(input.stage || '');
  if (aiProvider === 'mock') return { result: mockWriter(stage, input.context || {}), provider: 'mock' };
  if (!['openai-compatible', 'deepseek'].includes(aiProvider) || !aiApiKey || !aiBaseUrl || !aiModel) throw new Error('AI 服务未配置完整，请检查 AI_PROVIDER、AI_BASE_URL、AI_API_KEY 和 AI_MODEL。');
  const model = String(input.model || aiModel);
  const url = `${aiBaseUrl.endsWith('/v1') ? aiBaseUrl : `${aiBaseUrl}/v1`}/chat/completions`;
  let response;
  if (!model) throw new Error('未配置文本模型，请设置 CANGYUAN_TEXT_MODEL 或 AI_MODEL。');
  try { response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${aiApiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.4, max_tokens: 2400, stream: true, messages: [{ role: 'system', content: '你是结构化短剧编剧助手。只返回合法 JSON。' }, { role: 'user', content: String(input.prompt || '') }] }), signal: AbortSignal.timeout(aiTimeoutMs) }); } catch (error) { if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('AI 生成超时，请稍后重试或缩短输入内容。'); throw new Error('AI 服务连接失败，请检查 API 配置或网络。'); }
  const bodyText = await response.text(); let body; try { body = JSON.parse(bodyText); } catch { body = {}; }
  if (response.status === 401) throw new Error('AI API 鉴权失败，请检查 API Key。');
  if (response.status === 429) throw new Error('AI 请求过于频繁，请稍后重试。');
  if (!response.ok) throw new Error(body?.error?.message || 'AI 服务请求失败，请稍后重试。');
  const content = extractChatContent(bodyText, body);
  if (!content) throw new Error('模型返回为空，请重新生成。');
  return { result: parseModelJson(content), provider: aiProvider };
}
function seedanceModels(body) {
  return (body.data || []).map(item => typeof item === 'string' ? item : item.id).filter(Boolean).filter(id => /seedance/i.test(id));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/seedance/models') {
      if (!videoBaseUrl || !videoApiKey) return configError(res);
      const body = await gateway('/v1/models', {}, { baseUrl: videoBaseUrl, apiKey: videoApiKey });
      const discoveredModels = seedanceModels(body);
      // Keep a configured model visible in the selector even when this token's
      // model list does not advertise it. `configuredOnly` makes that state
      // explicit instead of presenting it as verified availability.
      const models = [...new Set([...discoveredModels, ...(configuredModel ? [configuredModel] : [])])];
      return json(res, 200, { models, discoveredModels, configuredModel: configuredModel || null, configuredOnly: Boolean(configuredModel && !discoveredModels.includes(configuredModel)) });
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/models') {
      if (!baseUrl || !apiKey) return configError(res);
      const body = await gateway('/v1/models');
      const models = (body.data || []).map(item => typeof item === 'string' ? item : item.id).filter(Boolean);
      const discoveredVideoModels = models.filter(id => /seedance|kling|veo|wan|video/i.test(id));
      const videoModels = [...new Set([...discoveredVideoModels, ...(configuredModel ? [configuredModel] : [])])];
      return json(res, 200, { models, textModels: configuredTextModels.filter(id => models.includes(id)), videoModels, discoveredVideoModels, configuredTextModel: aiModel || null, configuredVideoModel: configuredModel || null, configuredVideoOnly: Boolean(configuredModel && !discoveredVideoModels.includes(configuredModel)) });
    }
    if (req.method === 'POST' && url.pathname === '/api/seedance/videos') {
      if (!videoBaseUrl || !videoApiKey) return configError(res);
      const input = await readBody(req);
      const model = String(input.model || configuredModel || '');
      const prompt = String(input.prompt || '').trim();
      if (!model || !/seedance/i.test(model)) return json(res, 400, { error: '请选择模型列表中可用的 Seedance 模型。' });
      if (!prompt) return json(res, 400, { error: '提示词不能为空。' });
      // Keep the first live integration minimal. Model-specific fields must come from its live docs.
      const task = await gateway('/v1/videos', { method: 'POST', body: JSON.stringify({ model, prompt }) }, { baseUrl: videoBaseUrl, apiKey: videoApiKey });
      return json(res, 200, { taskId: task.task_id || task.id, status: task.status || 'queued', raw: task });
    }
    const match = url.pathname.match(/^\/api\/seedance\/videos\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      if (!videoBaseUrl || !videoApiKey) return configError(res);
      const body = await gateway(`/v1/videos/${encodeURIComponent(match[1])}`, {}, { baseUrl: videoBaseUrl, apiKey: videoApiKey });
      return json(res, 200, { taskId: match[1], status: body.status, videoUrl: body.video_url || body.data?.[0]?.url || null, error: body.fail_reason || body.error || null, raw: body });
    }
    if (req.method === 'GET' && url.pathname === '/api/seedance/status') return json(res, 200, { configured: Boolean(videoBaseUrl && videoApiKey), configuredModel: configuredModel || null, separateKey: Boolean(process.env.CANGYUAN_VIDEO_API_KEY) });
    if (req.method === 'POST' && url.pathname === '/api/ai/writer') return json(res, 200, await generateWriter(await readBody(req)));
    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, error.status || 500, { error: error.message || 'Seedance 请求失败。' });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Seedance API proxy listening on http://127.0.0.1:${port}`));
