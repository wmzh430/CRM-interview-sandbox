import { randomUUID } from 'node:crypto';
export function sendMessage(store, prospectId, body) {
  const data = store.read();
  const prospect = data.prospects.find(p => p.id === prospectId);
  if (!prospect) throw new Error('Prospect not found');
  if (typeof body !== 'string' || !body.trim() || body.length > 1600) throw new Error('Enter a message of 1-1600 characters');
  const message = { id: randomUUID(), prospectId, to: prospect.phone, body: body.trim(), status: 'sent', createdAt: new Date().toISOString() };
  data.messages.push(message);
  data.activity.push({ prospectId, title: 'Message sent', messageId: message.id });
  store.write(data);
  return message;
}
export function processWebhook(store, event) {
  const data = store.read();
  if (!['message.sent', 'message.status_updated'].includes(event.type)) throw new Error('Unsupported event');
  const existing = data.messages.find(m => m.id === event.messageId);
  if (!existing) throw new Error('Unknown message');
  existing.status = event.status || existing.status;
  if (typeof event.body === 'string') existing.body = event.body;
  store.write(data);
  return existing;
}
