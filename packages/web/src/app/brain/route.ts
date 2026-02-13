import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadHtml(): string | null {
  const paths = [
    join(process.cwd(), 'public', 'brain.html'),
    join(process.cwd(), 'packages', 'web', 'public', 'brain.html'),
  ];
  for (const p of paths) {
    if (existsSync(p)) return readFileSync(p, 'utf-8');
  }
  return null;
}

const html = loadHtml();

export function GET() {
  if (!html) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
