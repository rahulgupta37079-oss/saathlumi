import { HTTPException } from 'hono/http-exception';
import { signaturesEqual } from './payment-state.js';

const now = () => Math.floor(Date.now()/1000);
const fail = (status,message) => { throw new HTTPException(status,{message}); };
const amountInPaise = value => { const n=Number(value);return Number.isFinite(n)&&n>=0&&Math.abs(n*100-Math.round(n*100))<0.00001?Math.round(n*100):null; };
const validOrderId = value => typeof value==='string'&&/^slm_test_[a-f0-9]{32}$/.test(value);

export function cashfreeReadiness(env) {
 if(env.CASHFREE_ENV && env.CASHFREE_ENV!=='sandbox') return {enabled:false,mode:'sandbox',reason:'Live Cashfree payments are not enabled. Complete merchant, tax, refund, verification and security reviews first.'};
 if(env.CASHFREE_SANDBOX_ENABLED!=='true') return {enabled:false,mode:'sandbox',reason:'Sandbox checkout has not been enabled by the operator.'};
 if(!env.CASHFREE_APP_ID||!env.CASHFREE_SECRET_KEY) return {enabled:false,mode:'sandbox',reason:'Fresh Cashfree sandbox credentials are required in server-side secrets.'};
 if(!env.APP_ORIGIN || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(env.APP_ORIGIN)) return {enabled:false,mode:'sandbox',reason:'Configure a trusted HTTPS application origin and whitelist that domain in Cashfree.'};
 return {enabled:true,mode:'sandbox',reason:null};
}

export async function cashfreeSignature(secret,timestamp,rawBody) {
 const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(timestamp+rawBody)));
 return btoa(String.fromCharCode(...signature));
}

export function cashfreeSnapshot(local,order,payments,eventType='') {
 if(!order||order.order_id!==local.id||order.customer_details?.customer_id!==local.user_id||amountInPaise(order.order_amount)!==local.amount||order.order_currency!==local.currency) throw new Error('order_mismatch');
 if(!Array.isArray(payments)) throw new Error('invalid_payments');
 const successful=payments.find(p=>p.order_id===local.id&&p.payment_status==='SUCCESS'&&p.is_captured===true&&amountInPaise(p.payment_amount)===local.amount&&p.payment_currency===local.currency&&p.cf_payment_id);
 if(local.status==='review'||/REFUND|DISPUTE|CHARGEBACK/i.test(eventType))return {status:'review',payment_id:local.payment_id||null};
 if(local.status==='paid')return {status:'paid',payment_id:local.payment_id||String(successful?.cf_payment_id||'')||null};
 if(order.order_status==='PAID'&&successful)return {status:'paid',payment_id:String(successful.cf_payment_id)};
 if(order.order_status==='EXPIRED')return {status:'expired',payment_id:null};
 if(order.order_status==='TERMINATED')return {status:'terminated',payment_id:null};
 return {status:'active',payment_id:null};
}

async function provider(env,path,method='GET',body,idempotencyKey) {
 // Deliberately sandbox-only. Never infer environment from a supplied key.
 const res=await fetch('https://sandbox.cashfree.com/pg/'+path,{method,headers:{'x-client-id':env.CASHFREE_APP_ID,'x-client-secret':env.CASHFREE_SECRET_KEY,'x-api-version':'2025-01-01','Content-Type':'application/json',...(idempotencyKey?{'x-idempotency-key':idempotencyKey}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(res.status===404&&method==='GET')return null;
 if(!res.ok)fail(502,'Cashfree could not complete this request. Check sandbox credentials, domain approval, and provider availability.');
 try{return await res.json();}catch{fail(502,'Cashfree returned an invalid response.');}
}
async function ready(c) {const state=cashfreeReadiness(c.env);if(!state.enabled)fail(503,state.reason);return state;}
function summary(row) {return {order_id:row.id,amount:row.amount,currency:row.currency,status:row.status,environment:row.environment,created_at:row.created_at,expires_at:row.expires_at};}

export function mountCashfree(app,{auth,limit}) {
 async function reconcile(c,local,eventId,eventType='verification') {
  const order=await provider(c.env,'orders/'+encodeURIComponent(local.id));
  if(!order)fail(404,'The payment order has not been created at Cashfree yet. Retry checkout.');
  const payments=await provider(c.env,'orders/'+encodeURIComponent(local.id)+'/payments');
  let state;try{state=cashfreeSnapshot(local,order,payments||[],eventType);}catch{fail(400,'Payment details do not match this account and order.');}
  const statements=[];
  if(eventId)statements.push(c.env.DB.prepare('INSERT OR IGNORE INTO cashfree_events(id,order_id,kind) VALUES(?,?,?)').bind(eventId,local.id,eventType));
  statements.push(c.env.DB.prepare("UPDATE cashfree_orders SET status=CASE WHEN status='review' OR ?='review' THEN 'review' WHEN status='paid' OR ?='paid' THEN 'paid' ELSE ? END,payment_id=COALESCE(?,payment_id),updated_at=? WHERE id=? AND environment='sandbox'").bind(state.status,state.status,state.status,state.payment_id,now(),local.id));
  await c.env.DB.batch(statements);
  // A sandbox success MUST NOT activate real membership or verification.
  return c.env.DB.prepare('SELECT * FROM cashfree_orders WHERE id=?').bind(local.id).first();
 }
 app.get('/cashfree/config',auth,async c=>{const settings=await c.env.DB.prepare("SELECT value FROM settings WHERE key='male_amount'").first();return c.json({...cashfreeReadiness(c.env),provider:'Cashfree',amount:Number(settings?.value||29900),currency:'INR',sandbox_only:true,membership_activation:false});});
 app.post('/cashfree/orders',auth,async c=>{
  await ready(c);const u=c.get('user');await limit(c,'cashfree-order:'+u.id,8,3600);
  if(u.gender!=='man')fail(409,'This paid membership does not apply to this account.');
  if(await c.env.DB.prepare('SELECT 1 FROM deletion_requests WHERE user_id=?').bind(u.id).first())fail(403,'Checkout is unavailable while account deletion is pending.');
  const b=await c.req.json();if(typeof b.phone!=='string'||!/^\d{10}$/.test(b.phone))fail(400,'Enter a 10-digit customer phone number for sandbox checkout.');
  const setting=await c.env.DB.prepare("SELECT value FROM settings WHERE key='male_amount'").first();const amount=Number(setting?.value);
  if(amount!==29900)fail(503,'The approved sandbox membership amount must be ₹299.');
  // Reserve one canonical order before external calls. Parallel retries reuse its UUID.
  await c.env.DB.prepare("UPDATE cashfree_orders SET status='expired',updated_at=? WHERE user_id=? AND environment='sandbox' AND status IN ('creating','active') AND expires_at<=?").bind(now(),u.id,now()).run();
  const proposed='slm_test_'+crypto.randomUUID().replaceAll('-','');const idempotency=crypto.randomUUID();
  await c.env.DB.prepare("INSERT OR IGNORE INTO cashfree_orders(id,user_id,environment,amount,currency,status,idempotency_key,expires_at) VALUES(?,?,'sandbox',?,'INR','creating',?,?)").bind(proposed,u.id,amount,idempotency,now()+1800).run();
  let local=await c.env.DB.prepare("SELECT * FROM cashfree_orders WHERE user_id=? AND environment='sandbox' AND status IN ('creating','active')").bind(u.id).first();
  if(!local)fail(409,'The checkout state changed. Refresh and try again.');
  let order=await provider(c.env,'orders/'+local.id);
  if(!order)order=await provider(c.env,'orders','POST',{order_id:local.id,order_amount:local.amount/100,order_currency:'INR',customer_details:{customer_id:u.id,customer_phone:b.phone},order_meta:{return_url:c.env.APP_ORIGIN+'/payment-result?order_id='+local.id},order_expiry_time:new Date(local.expires_at*1000).toISOString(),order_note:'Saathlumi sandbox membership test; no real access is activated'},local.idempotency_key);
  try{cashfreeSnapshot(local,order,[]);}catch{fail(502,'Cashfree returned an order that does not match the saved checkout.');}
  if(order.order_status!=='ACTIVE') {const updated=await reconcile(c,local,null);return c.json({...summary(updated),message:'This test order is no longer payable. Check its result.'});}
  if(typeof order.payment_session_id!=='string'||order.payment_session_id.length<10||order.payment_session_id.length>2000)fail(502,'Cashfree did not return a valid payment session.');
  await c.env.DB.prepare("UPDATE cashfree_orders SET status='active',payment_session_id=?,updated_at=? WHERE id=? AND status IN ('creating','active')").bind(order.payment_session_id,now(),local.id).run();
  return c.json({order_id:local.id,payment_session_id:order.payment_session_id,amount:local.amount,currency:'INR',environment:'sandbox',status:'active'});
 });
 app.get('/cashfree/orders',auth,async c=>{const {results}=await c.env.DB.prepare('SELECT id,amount,currency,status,environment,created_at,expires_at FROM cashfree_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(c.get('user').id).all();return c.json({orders:results.map(summary)});});
 app.post('/cashfree/orders/:id/verify',auth,async c=>{
  await ready(c);if(!validOrderId(c.req.param('id')))fail(404,'Order not found.');await limit(c,'cashfree-verify:'+c.get('user').id,30,900);
  const row=await c.env.DB.prepare("SELECT * FROM cashfree_orders WHERE id=? AND user_id=? AND environment='sandbox'").bind(c.req.param('id'),c.get('user').id).first();if(!row)fail(404,'Order not found.');
  const result=await reconcile(c,row,null);return c.json({...summary(result),membership_activated:false,message:result.status==='paid'?'Sandbox payment verified. No real membership or verification has been activated.':result.status==='review'?'This sandbox transaction needs review. No membership has been activated.':'No successful captured payment has been confirmed yet.'});
 });
 app.post('/cashfree/webhook',async c=>{
  await ready(c);const timestamp=c.req.header('x-webhook-timestamp')||'',signature=c.req.header('x-webhook-signature')||'';
  if(!/^\d{13}$/.test(timestamp))fail(400,'Invalid webhook timestamp.');
  const raw=await c.req.text();if(raw.length>65536)fail(413,'Webhook body is too large.');
  if(!signaturesEqual(await cashfreeSignature(c.env.CASHFREE_SECRET_KEY,timestamp,raw),signature))fail(400,'Invalid Cashfree webhook signature.');
  let event;try{event=JSON.parse(raw);}catch{fail(400,'Invalid webhook JSON.');}
  const orderId=event.data?.order?.order_id||event.data?.refund?.order_id||event.data?.dispute?.order_id;
  if(!validOrderId(orderId))return c.json({ignored:true});
  const row=await c.env.DB.prepare("SELECT * FROM cashfree_orders WHERE id=? AND environment='sandbox'").bind(orderId).first();if(!row)return c.json({ignored:true});
  const eventId=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(n=>n.toString(16).padStart(2,'0')).join('');
  if(await c.env.DB.prepare('SELECT 1 FROM cashfree_events WHERE id=?').bind(eventId).first())return c.json({received:true,duplicate:true});
  const updated=await reconcile(c,row,eventId,String(event.type||'unknown'));
  return c.json({received:true,status:updated.status});
 });
}
