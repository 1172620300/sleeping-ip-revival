import { assistantSamples } from './assistant-samples';
import type { Asset, DemoState, IP, Project, Shot } from './types';

const featuredCatalogIndexes = new Set([0, 1, 6, 12, 13, 18]);
const catalogIp = (id: string, title: string, category: IP['category'], subtitle: string, color: string, sortOrder: number): IP => ({ id, title, category, subtitle, description: `${title} 的演示资料，包含角色关系、世界观线索与可延展的创作方向。`, genre: category, format: category === '游戏世界' ? '互动故事' : '动画短片', available: false, cover: id, color, owner: 'imaideo · IP 资源演示库', rules: '演示资料仅用于浏览世界观与创作方向。', world: `${title} 的世界正在等待新的创作者补完。`, featured: featuredCatalogIndexes.has(sortOrder), demoOnly: true, sortOrder });
const catalogIps: IP[] = [
  ['haier', '海尔兄弟', '童年经典', '一起出发，去发现世界。', '#78bfd0'], ['hululu', '葫芦娃', '童年经典', '七种勇气，守护同一个家。', '#d69d55'], ['blackcat', '黑猫警长', '童年经典', '城市里，总有一束光在巡逻。', '#91b0a0'], ['bighead', '大头儿子小头爸爸', '童年经典', '家的故事，每天都有新一集。', '#e1ad72'], ['digimon', '数码宝贝', '童年经典', '在另一个世界遇见伙伴。', '#6c9fd1'], ['ultraman', '奥特曼', '童年经典', '当城市需要英雄，光就会出现。', '#cf776f'],
  ['nezha', '哪吒传奇', '国漫动画', '少年心气，闯出自己的传说。', '#bd7355'], ['pleasant-goat', '喜羊羊与灰太狼', '国漫动画', '青青草原每天都在发生新故事。', '#9dcc7d'], ['boonie', '熊出没', '国漫动画', '森林深处，朋友总会相遇。', '#a8825e'], ['little-carp', '小鲤鱼历险记', '国漫动画', '沿着河流，去看更大的世界。', '#62b6c3'], ['journey-west', '大闹天宫', '国漫动画', '一根金箍棒，写下无边想象。', '#d08c50'], ['new-journey', '西游记动画', '国漫动画', '师徒同行，故事永远在路上。', '#9b7db0'],
  ['seer', '赛尔号', '游戏世界', '驾驶飞船，探索未知星球。', '#5ca9d5'], ['roc', '洛克王国', '游戏世界', '魔法学院里，每个人都有伙伴。', '#9a80d1'], ['mole', '摩尔庄园', '游戏世界', '在小镇里过自己的慢生活。', '#db9b72'], ['aobi', '奥比岛', '游戏世界', '岛屿之外，还有新的朋友。', '#77c6b7'], ['genshin', '原神', '游戏世界', '七种元素，交汇出新的旅途。', '#879cd6'], ['honor', '王者荣耀', '游戏世界', '英雄集结，打开一场新对局。', '#d38d5d'],
  ['pokemon', '宝可梦', '国际 IP', '和伙伴一起，踏上新的冒险。', '#e5a85c'], ['doraemon', '哆啦A梦', '国际 IP', '一件道具，打开一段想象。', '#69a9d0'], ['tom-jerry', '猫和老鼠', '国际 IP', '追逐之外，也有意外的默契。', '#c79562'], ['transformers', '变形金刚', '国际 IP', '机械与城市，重新组合未来。', '#7e9dcc'], ['spongebob', '海绵宝宝', '国际 IP', '海底社区里的快乐日常。', '#d8c65f'], ['minecraft', '我的世界', '国际 IP', '从一块方块开始建造世界。', '#8ca77b'],
].map(([id, title, category, subtitle, color], index) => catalogIp(id, title, category as IP['category'], subtitle, color, index));

export const ips: IP[] = [
  { id: 'cloud', title: '云山邮局', subtitle: '每一封信，都有一座山的距离。', description: '在云海之上的邮局，一位年轻信使收到一封寄给四十年前的信。沿着山路，她寻找收信人，也重新发现了人与人之间的牵挂。', genre: '国风奇幻', format: '动画短片', available: true, cover: 'cloud', color: '#9bbaab', owner: '云山故事社 · 示例版权方', rules: '保留信使善良、勇敢的人物核心；允许支线故事与新增配角。不可改变邮局传递情感的世界观。演示资产仅供本样板体验。', world: '群山之间，云海会把未送达的信带到山顶邮局。每一封信只给信使一天时间，日落之前，她必须找到信的归处。', category: '国漫动画', featured: true, demoOnly: false, sortOrder: 100 },
  { id: 'sea', title: '深蓝航线', subtitle: '驶向地图没有标记的地方。', description: '少年领航员与一艘会做梦的旧船，在星光与潮汐之间寻找失落的灯塔。', genre: '冒险', format: '动画短片', available: true, cover: 'sea', color: '#a7b9d3', owner: '深蓝创作室 · 示例版权方', rules: '保留探索与协作主题；可创作新的岛屿与航海经历。演示资产仅供本样板体验。', world: '海洋每到满月就会重排航路，旧地图只能指向记忆；领航员必须学会读懂潮汐。', category: '国漫动画', featured: true, demoOnly: false, sortOrder: 101 },
  { id: 'lantern', title: '小城灯火', subtitle: '那些平凡日子里的微光。', description: '冬日小城里，一个修钟老人和一个寻找灯笼的孩子，重新点亮被遗忘的街道。', genre: '温情', format: '动态漫', available: true, cover: 'lantern', color: '#d6b5a7', owner: '灯火工作室 · 示例版权方', rules: '保持温暖日常的基调，尊重儿童角色；可拓展街坊支线。演示资产仅供本样板体验。', world: '每个街坊都有一盏只在特殊时刻亮起的灯；灯亮的时候，人们会想起一件忘记很久的事。', category: '国漫动画', featured: true, demoOnly: false, sortOrder: 102 },
  { id: 'book', title: '天书奇谭', subtitle: '东方奇想，等待新的讲述。', description: '经典 IP 合作方向展示。演示页仅用于产品表达。', genre: '国风奇幻', format: '动画短片', available: false, cover: 'book', color: '#b6afa0', owner: 'imaideo · IP 资源演示库', rules: '仅展示 IP 资料与创作方向。', world: '东方奇想的世界，等待新的讲述。', category: '国漫动画', featured: false, demoOnly: false, sortOrder: 103 },
  { id: 'deer', title: '九色鹿', subtitle: '让关于善意的故事再次被看见。', description: '经典 IP 合作方向展示。演示页仅用于产品表达。', genre: '国风奇幻', format: '动画短片', available: false, cover: 'deer', color: '#cfbc9a', owner: 'imaideo · IP 资源演示库', rules: '仅展示 IP 资料与创作方向。', world: '关于善意与选择的故事，仍然可以被重新讲述。', category: '国漫动画', featured: false, demoOnly: false, sortOrder: 104 },
  { id: 'snow', title: '雪孩子', subtitle: '温柔的记忆，还能长出新的故事。', description: '经典 IP 合作方向展示。演示页仅用于产品表达。', genre: '温情', format: '动态漫', available: false, cover: 'snow', color: '#c1d0d5', owner: 'imaideo · IP 资源演示库', rules: '仅展示 IP 资料与创作方向。', world: '温柔的记忆，也能长出新的故事。', category: '国漫动画', featured: false, demoOnly: false, sortOrder: 105 },
  ...catalogIps,
];
export const assets: Asset[] = [
  { id: 'courier', ipId: 'cloud', name: '阿遥 · 山间信使', kind: '角色', description: '短黑发、赭橙色披风、旧邮袋。勇敢而耐心，始终相信每封信都有归处。不可改变披风主色与人物核心性格。', version: '1.0', source: 'ip', cover: 'cloud', frame: 2 },
  { id: 'grandma', ipId: 'cloud', name: '林婆婆 · 等信的人', kind: '角色', description: '靛蓝棉衣、灰白头发，住在山腰木屋。克制、温和，用眼神表达等待。', version: '1.0', source: 'ip', cover: 'cloud', frame: 4 },
  { id: 'postoffice', ipId: 'cloud', name: '云顶邮局', kind: '场景', description: '青瓦木屋、暖色窗灯、云海环绕，邮局连接一座狭窄石桥。', version: '1.1', source: 'ip', cover: 'cloud', frame: 0 },
  { id: 'bridge', ipId: 'cloud', name: '过云石桥', kind: '场景', description: '石桥自左向右通向山腰；晨雾与青绿色山峰保持一致。', version: '1.0', source: 'ip', cover: 'cloud', frame: 2 },
  { id: 'letter', ipId: 'cloud', name: '未寄出的信', kind: '道具', description: '象牙白旧信封，深褐邮戳，无需展示可读地址。', version: '1.0', source: 'ip', cover: 'cloud', frame: 3 },
  { id: 'ship', ipId: 'sea', name: '回声号', kind: '道具', description: '红色船帆的小木船，灯光如呼吸一般明灭。', version: '1.0', source: 'ip', cover: 'sea' },
  { id: 'ocean', ipId: 'sea', name: '月升海域', kind: '场景', description: '深蓝海水、月色、远方的黄铜灯塔。', version: '1.0', source: 'ip', cover: 'sea' },
  { id: 'town', ipId: 'lantern', name: '旧城街巷', kind: '场景', description: '蓝紫暮色、积雪木屋与暖黄色窗灯。', version: '1.0', source: 'ip', cover: 'lantern' },
  { id: 'light', ipId: 'lantern', name: '一盏纸灯', kind: '道具', description: '手工红纸灯笼，光源柔和。', version: '1.0', source: 'ip', cover: 'lantern' },
  { id: 'personal-note', ipId: 'cloud', name: '晨雾色彩笔记', kind: '场景', description: '创作者个人参考：用青灰表现清晨，暖金表现信送达的瞬间。', version: '1.0', source: 'personal', cover: 'cloud', frame: 5 },
];
export function makeShots(ipId = 'cloud'): Shot[] {
  const descriptions = ipId === 'cloud' ? [
    ['云海来信', '晨光穿过云海，远处的云顶邮局亮着一盏灯。', '有些信，走了很久。', '缓慢推进', ['postoffice']],
    ['四十年前', '阿遥从木柜上拿起一封旧信，凝视褪色的邮戳。', '这封信，怎么还没有寄出？', '中景转近景', ['courier', 'letter', 'postoffice']],
    ['越过云山', '阿遥背着邮袋走过石桥，橙色披风在晨风里轻轻扬起。', '', '侧向跟拍', ['courier', 'bridge']],
    ['信的重量', '手指展开信纸，纸边被岁月磨得柔软。', '如果你收到这封信，就替我看看春天。', '手部特写', ['letter', 'courier']],
    ['终于抵达', '林婆婆站在门口接过信，抬头看向年轻的信使。', '我以为，再也等不到了。', '固定中景', ['grandma', 'courier', 'letter']],
    ['新的启程', '阿遥望向被朝阳染亮的群山，一只纸鹤掠过云海。', '只要还有人在等，信就一定会抵达。', '缓缓拉远', ['courier', 'bridge']],
  ] : Array.from({ length: 6 }, (_, i) => [i === 0 ? '故事开始' : `新的发现 ${i}`, `${ips.find(x => x.id === ipId)?.title}的故事画面 ${i + 1}。`, i === 5 ? '新的旅程，才刚刚开始。' : '', '缓慢推进', assets.filter(x => x.ipId === ipId).map(x => x.id)]);
  return descriptions.map((d, i) => ({ id: `shot-${i + 1}`, title: d[0] as string, description: d[1] as string, dialogue: d[2] as string, duration: 10, camera: d[3] as string, assetIds: d[4] as string[], frame: i, clipStatus: 'idle', selected: false, failOnce: false }));
}
export function makeProject(id: string, taskId: string, ipId: string, title: string): Project {
  const ip = ips.find(x => x.id === ipId)!;
  const sample = assistantSamples[ipId];
  return { id, title, ipId, taskId, status: 'draft', updatedAt: new Date().toISOString(), script: { idea: sample?.idea ?? ip.description, format: '60 秒短片', synopsis: ip.description, characters: sample?.characters ?? '', body: makeShots(ipId).map((s, i) => `第 ${i + 1} 场 · ${s.title}\n${s.description}\n${s.dialogue ? `台词：${s.dialogue}` : '无对白，保留环境声。'}`).join('\n\n'), confirmedBody: '', revision: 1 }, assetIds: assets.filter(x => x.ipId === ipId && x.source === 'ip').map(x => x.id), assetNotes: '', shots: makeShots(ipId), canvas: {}, zoom: 1, submission: { title, summary: ip.description, author: '林间 · 演示创作者', note: sample?.synopsis ?? ip.description } };
}
export function createSeed(): DemoState {
  const deadline = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const tasks = [
    { id: 'letters', ipId: 'cloud', title: '一封迟到的信', brief: '以云山邮局为起点，讲述一次意料之外的送信旅程。我们希望看到温柔、克制，却能打动人的新故事。', format: '动画短片', seconds: 60, deadline, reward: '创作扶持 ¥8,000', rules: ips[0].rules, assetIds: assets.filter(a => a.ipId === 'cloud' && a.source === 'ip').map(a => a.id), criteria: '故事完整度 40% · IP 一致性 30% · 视听表达 30%（演示规则）' },
    { id: 'voyage', ipId: 'sea', title: '向未知出发', brief: '为回声号创作一段驶向未知岛屿的旅程，让冒险与勇气拥有新的表达。', format: '动画短片', seconds: 60, deadline, reward: '创作扶持 ¥6,000', rules: ips[1].rules, assetIds: ['ship', 'ocean'], criteria: '故事 40% · 世界观 30% · 视听 30%（演示规则）' },
    { id: 'warmth', ipId: 'lantern', title: '点亮一盏灯', brief: '用一分钟讲述小城里的善意，寻找冬日生活中容易被忽略的温暖。', format: '动态漫', seconds: 60, deadline, reward: '创作扶持 ¥5,000', rules: ips[2].rules, assetIds: ['town', 'light'], criteria: '情感表达 50% · IP 一致性 30% · 视听 20%（演示规则）' },
  ];
  const projects = [
    makeProject('p-draft', 'letters', 'cloud', '山的另一边'),
    makeProject('p-producing', 'letters', 'cloud', '迟到的春天'),
    makeProject('p-review', 'letters', 'cloud', '云端来信'),
    makeProject('p-changes', 'letters', 'cloud', '未寄出的思念'),
    makeProject('p-selected', 'letters', 'cloud', '山间的回音'),
  ];
  projects[1].status = 'producing'; projects[2].status = 'review'; projects[3].status = 'changes'; projects[4].status = 'selected';
  for (const p of projects.slice(1)) { p.script.confirmedBody = p.script.body; p.shots.forEach((s, i) => { s.clipStatus = p.id === 'p-producing' && i > 1 ? 'idle' : 'done'; s.selected = s.clipStatus === 'done'; }); }
  const submissions = projects.slice(2).map((p, i) => ({ id: `submission-seed-${i}`, projectId: p.id, taskId: p.taskId, version: 1, snapshot: structuredClone(p), context: { ip: structuredClone(ips.find(x => x.id === p.ipId)!), assets: structuredClone(assets.filter(a => p.assetIds.includes(a.id))), task: structuredClone(tasks.find(t => t.id === p.taskId)!) }, submittedAt: new Date().toISOString(), status: (i === 0 ? 'pending' : i === 1 ? 'changes' : 'selected') as 'pending' | 'changes' | 'selected', notes: i === 1 ? [{ id: 'note-seed', shotId: 'shot-5', text: '请给林婆婆接信的动作多一点停顿，让情绪自然落下。', createdAt: new Date().toISOString() }] : [] }));
  return { schema: 1, role: 'creator', ips: structuredClone(ips), assets: structuredClone(assets), tasks, projects, submissions };
}
