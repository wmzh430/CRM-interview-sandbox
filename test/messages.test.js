import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/store.js';
import { sendMessage, processWebhook } from '../src/messages.js';
function memoryStore() { let data = seed(); return { read: () => structuredClone(data), write: value => { data = structuredClone(value); } }; }
test('sending persists the selected prospect and text', () => {
  const store = memoryStore();
  const message = sendMessage(store, 'p-102', 'Hello');
  assert.equal(message.prospectId, 'p-102');
  assert.equal(store.read().messages[0].body, 'Hello');
});
test('blank message is rejected', () => { assert.throws(() => sendMessage(memoryStore(), 'p-102', ' ')); });
test('unknown webhook message is rejected', () => { assert.throws(() => processWebhook(memoryStore(), { type: 'message.sent', messageId: 'missing' })); });

// Regression: Alex Morgan (p-101) and Jordan Morgan (p-102) share a phone number.
// A sent-webhook for Jordan's message must not reassign it to Alex's thread.
test('webhook for a message does not move it to another prospect sharing the same number', () => {
  const store = memoryStore();
  const message = sendMessage(store, 'p-102', 'Hello Jordan');
  processWebhook(store, { type: 'message.sent', messageId: message.id, externalNumber: '+12025550123', status: 'sent', body: 'Hello Jordan' });
  const stored = store.read().messages.find(m => m.id === message.id);
  assert.equal(stored.prospectId, 'p-102');
});

test('duplicate webhook events do not duplicate the message', () => {
  const store = memoryStore();
  const message = sendMessage(store, 'p-102', 'Hello Jordan');
  const event = { type: 'message.sent', messageId: message.id, externalNumber: '+12025550123', status: 'sent', body: 'Hello Jordan' };
  processWebhook(store, event);
  processWebhook(store, event);
  assert.equal(store.read().messages.filter(m => m.id === message.id).length, 1);
});

test('status-only webhook events preserve the existing body', () => {
  const store = memoryStore();
  const message = sendMessage(store, 'p-102', 'Hello Jordan');
  processWebhook(store, { type: 'message.status_updated', messageId: message.id, externalNumber: '+12025550123', status: 'delivered' });
  const stored = store.read().messages.find(m => m.id === message.id);
  assert.equal(stored.body, 'Hello Jordan');
  assert.equal(stored.status, 'delivered');
});
