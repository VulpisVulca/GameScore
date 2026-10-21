import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function runtimeGraph(file = 'app.js', graph = new Map()) {
  if (graph.has(file)) return graph;
  const source = await readFile(resolve(root, file), 'utf8');
  const imports = [...source.matchAll(/(?:^|\n)import\s+[\s\S]*?\sfrom\s*['"]([^'"]+)['"]/g)].map((m) =>
    relative(root, resolve(root, dirname(file), m[1])).replaceAll('\\', '/'),
  );
  graph.set(file, imports);
  for (const dependency of imports) await runtimeGraph(dependency, graph);
  return graph;
}
test('Every runtime module is offline-cached, deployable, and part of an acyclic import graph', async () => {
  const graph = await runtimeGraph();
  const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
  const workflow = await readFile(resolve(root, '.github/workflows/pages.yml'), 'utf8');
  const cacheFiles = new Set([...sw.matchAll(/['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]));
  const visited = new Set(),
    active = new Set();
  function visit(file) {
    assert.equal(active.has(file), false, 'Circular import at ' + file);
    if (visited.has(file)) return;
    active.add(file);
    for (const dep of graph.get(file)) visit(dep);
    active.delete(file);
    visited.add(file);
  }
  visit('app.js');
  for (const file of graph.keys()) {
    assert.ok(cacheFiles.has(file), 'Offline cache missing ' + file);
    assert.ok(
      !file.includes('/') ||
        file.startsWith('ui/') ||
        file.startsWith('controllers/') ||
        file.startsWith('locales/'),
      'Deployment must copy ' + file,
    );
  }
  assert.match(workflow, /\*\.js/);
  assert.match(workflow, /assets locales ui controllers/);
});
test('Application startup contains no view templates or direct game storage access', async () => {
  const entry = await readFile(resolve(root, 'app.js'), 'utf8');
  assert.doesNotMatch(entry, /innerHTML|localStorage|html`/);
  assert.ok(entry.split('\n').length < 30);
  for (const file of ['storage.js', 'round-state.js', 'accounting.js']) {
    const source = await readFile(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /\bdocument\b|\bwindow\b|ui\//, file + ' must work without a browser DOM');
  }
});
