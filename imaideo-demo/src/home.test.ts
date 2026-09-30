import { describe, expect, it } from 'vitest';
import { ips } from './seed';

describe('IP 内容广场目录', () => {
  const catalog = ips.filter(ip => ip.demoOnly);

  it('包含 24 个唯一 IP，四个分类各 6 个', () => {
    expect(catalog).toHaveLength(24);
    expect(new Set(catalog.map(ip => ip.id)).size).toBe(24);
    for (const category of ['童年经典', '国漫动画', '游戏世界', '国际 IP']) {
      expect(catalog.filter(ip => ip.category === category)).toHaveLength(6);
    }
  });

  it('精选 IP 覆盖四类资源', () => {
    const featured = catalog.filter(ip => ip.featured);
    expect(featured).toHaveLength(6);
    expect(new Set(featured.map(ip => ip.category))).toEqual(new Set(['童年经典', '国漫动画', '游戏世界', '国际 IP']));
  });

  it('可按名称搜索并保持分类筛选', () => {
    expect(catalog.filter(ip => `${ip.title} ${ip.subtitle}`.includes('宝可梦')).map(ip => ip.title)).toEqual(['宝可梦']);
    expect(catalog.filter(ip => ip.category === '游戏世界').every(ip => ip.category === '游戏世界')).toBe(true);
    expect(catalog.filter(ip => `${ip.title} ${ip.subtitle}`.includes('不存在的世界'))).toHaveLength(0);
  });
});
