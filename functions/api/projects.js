const INDEX_KEY = '_data/projects.json';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function loadProjects(bucket) {
  const object = await bucket.get(INDEX_KEY);
  if (!object) return [];
  try { const value = await object.json(); return Array.isArray(value) ? value : []; } catch { return []; }
}

export async function onRequestGet({ env }) {
  if (!env.MEDIA_BUCKET) return json({ ok: false, error: 'MEDIA_BUCKET binding is unavailable.' }, 500);
  const projects = await loadProjects(env.MEDIA_BUCKET);
  return json({ ok: true, projects });
}

export async function onRequestPost({ request, env }) {
  if (!env.MEDIA_BUCKET) return json({ ok: false, error: 'MEDIA_BUCKET binding is unavailable.' }, 500);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: 'Invalid project data.' }, 400); }

  const title = String(input.title || '').trim();
  const location = String(input.location || '').trim();
  const service = String(input.service || '').trim();
  const description = String(input.description || '').trim();
  const photos = Array.isArray(input.photos) ? input.photos.filter(p => p && typeof p.key === 'string' && p.key.startsWith('projects/')).map(p => ({ key: p.key, role: ['before','after','detail'].includes(p.role) ? p.role : 'detail' })) : [];
  if (!title) return json({ ok: false, error: 'Project title is required.' }, 400);
  if (!photos.length) return json({ ok: false, error: 'Add at least one photo.' }, 400);

  const projects = await loadProjects(env.MEDIA_BUCKET);
  const id = crypto.randomUUID();
  const project = { id, slug: slugify(title) || id, title, location, service, description, published: Boolean(input.published), photos, createdAt: new Date().toISOString() };
  projects.unshift(project);
  await env.MEDIA_BUCKET.put(INDEX_KEY, JSON.stringify(projects, null, 2), { httpMetadata: { contentType: 'application/json' } });
  return json({ ok: true, project }, 201);
}
