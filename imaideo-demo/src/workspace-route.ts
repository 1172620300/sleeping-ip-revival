import type { Project } from './types';

export type AssistantMode = 'writer' | 'director';
export function assistantPath(projectId: string, mode: AssistantMode) {
  return `/assistants/${mode}/${encodeURIComponent(projectId)}`;
}
export function resolveWorkspace(route: string, projects: Project[]) {
  const [path, query] = route.split('?');
  const parts = path.split('/');
  if (parts[1] === 'assistants' && (parts[2] === 'writer' || parts[2] === 'director') && parts[3]) {
    return { mode: parts[2] as AssistantMode, projectId: parts[3] };
  }
  if (parts[1] !== 'studio' || !parts[2]) return null;
  const requested = new URLSearchParams(query).get('assistant');
  const project = projects.find(p => p.id === parts[2]);
  const mode: AssistantMode = requested === 'writer' || requested === 'director' ? requested : !project || project.status === 'draft' ? 'writer' : 'director';
  return { mode, projectId: parts[2] };
}
