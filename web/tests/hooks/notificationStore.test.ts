import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationStore } from '../../src/hooks/useNotification';

describe('createNotificationStore', () => {
  it('stores and clears notifications', () => {
    const store = createNotificationStore();

    assert.equal(store.get(), null);
    store.show('success', 'Tudo certo!');
    assert.deepEqual(store.get(), { type: 'success', message: 'Tudo certo!' });
    store.clear();
    assert.equal(store.get(), null);
  });
});
