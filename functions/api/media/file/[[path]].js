function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet(context) {
  if (!context.env.MEDIA_BUCKET) return json({ ok: false, error: 'MEDIA_BUCKET binding is unavailable.' }, 500);

  const raw = context.params.path;
  const key = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  if (!key || !key.startsWith('projects/')) return json({ ok: false, error: 'Invalid media path.' }, 400);

  const object = await context.env.MEDIA_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=3600');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}
