import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalDataProvider } from '../src/providers/LocalDataProvider';

test('Uncategorized cannot become a managed category and legacy references stay stored', async () => {
  const storage = new Map<string, string>([
    ['dailio_reserved_categories', JSON.stringify([{ id: 'old', name: 'Uncategorized' }])],
    ['dailio_reserved_settings', '{}'],
  ]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  const provider = new LocalDataProvider();
  assert.deepEqual(await provider.getCategories('reserved'), []);
  await assert.rejects(provider.addCategory('reserved', ' Uncategorized '), /reserved/);
  assert.equal(JSON.parse(storage.get('dailio_reserved_categories')!)[0].id, 'old');
});

test('default categories are created once, and individual or complete deletion survives reconnection', async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  const provider = new LocalDataProvider();
  const defaults = await provider.getCategories('test');
  assert.equal(defaults.length, 7);
  await provider.deleteCategory('test', 'cat_hygiene');
  assert.equal((await new LocalDataProvider().getCategories('test')).some(c => c.id === 'cat_hygiene'), false);
  for (const category of await provider.getCategories('test')) await provider.deleteCategory('test', category.id);
  assert.deepEqual(await new LocalDataProvider().getCategories('test'), []);
  assert.equal(storage.get('dailio_test_categories'), '[]');
});
