import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalDataProvider } from '../src/providers/LocalDataProvider';

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
