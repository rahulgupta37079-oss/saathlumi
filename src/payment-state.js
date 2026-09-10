// Pure reconciliation rules. Provider transport and D1 persistence are tested separately.
export function nextPaymentState(current, payment, eventType='') {
  if (eventType.startsWith('payment.dispute.')) return 'disputed';
  if (current === 'disputed') return 'disputed';
  if (current === 'refunded' || payment.status === 'refunded' || Number(payment.amount_refunded || 0) >= payment.amount) return 'refunded';
  if (payment.status === 'captured' || current === 'captured') return 'captured';
  if (payment.status === 'failed') return 'failed';
  return 'created';
}
export function paymentMatchesOrder(order, payment, expectedUser) {
  return !!order && (!expectedUser || order.user_id === expectedUser) && order.id === payment.order_id && order.amount === payment.amount && order.currency === payment.currency;
}
export async function signPayment(secret, payload) {
  const data = new TextEncoder();
  const key = await crypto.subtle.importKey('raw',data.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const result = await crypto.subtle.sign('HMAC',key,data.encode(payload));
  return Array.from(new Uint8Array(result)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function signaturesEqual(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false;
  let difference=0;for(let i=0;i<a.length;i++) difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
