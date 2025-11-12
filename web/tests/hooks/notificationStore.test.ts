import { describe, it, expect } from 'vitest';
import { createNotificationStore } from '../../src/hooks/useNotification';

describe('createNotificationStore', () => {
  it('stores and clears notifications', () => {
    const store = createNotificationStore();

    expect(store.get()).toBe(null);
    store.show('success', 'Tudo certo!');
    expect(store.get()).toEqual({ type: 'success', message: 'Tudo certo!' });
    store.clear();
    expect(store.get()).toBe(null);
  });
});
