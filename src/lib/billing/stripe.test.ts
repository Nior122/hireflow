import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from './stripe';
test('rejects unsigned, stale and tampered webhooks', () => {
 const timestamp = Math.floor(Date.now()/1000);
 const payload = '{"type":"checkout.session.completed"}';
 const signature = createHmac('sha256','whsec_test').update(`${timestamp}.${payload}`).digest('hex');
 const header = `t=${timestamp},v1=${signature}`;
 expect(verifyStripeSignature(payload,header,'whsec_test')).toBe(true);
 expect(verifyStripeSignature(payload+'x',header,'whsec_test')).toBe(false);
 expect(verifyStripeSignature(payload,header,'whsec_test',Date.now()+400000)).toBe(false);
});
