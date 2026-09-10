-- Verification results only. No Aadhaar numbers, documents, selfies or biometric templates.
ALTER TABLE users ADD COLUMN selfie_verified INTEGER NOT NULL DEFAULT 0 CHECK(selfie_verified IN (0,1));
ALTER TABLE users ADD COLUMN id_document_verified INTEGER NOT NULL DEFAULT 0 CHECK(id_document_verified IN (0,1));

CREATE TABLE cashfree_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
 amount INTEGER NOT NULL CHECK(amount>0),
 currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 status TEXT NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','active','paid','expired','terminated','review')),
 idempotency_key TEXT NOT NULL UNIQUE,
 payment_session_id TEXT,
 payment_id TEXT,
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 expires_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX cashfree_open_order ON cashfree_orders(user_id,environment) WHERE status IN ('creating','active');
CREATE TABLE cashfree_events (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES cashfree_orders(id),
 kind TEXT NOT NULL,
 received_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cashfree_history ON cashfree_orders(user_id,created_at);

-- Keep every matching recipient behind the new private verification requirements.
DROP TRIGGER private_plan_match;
CREATE TRIGGER private_plan_match AFTER INSERT ON private_plans BEGIN
 INSERT INTO private_invitations(id,plan_id,recipient_id)
 SELECT lower(hex(randomblob(16))),NEW.id,p.user_id
 FROM notification_preferences p JOIN users u ON u.id=p.user_id JOIN memberships m ON m.user_id=u.id
 WHERE p.enabled=1 AND p.city=NEW.city AND u.id<>NEW.owner_id
 AND u.email_verified=1 AND u.adult_verified=1 AND u.selfie_verified=1
 AND (u.gender<>'man' OR u.id_document_verified=1)
 AND u.suspended=0 AND m.status='active'
 AND EXISTS(SELECT 1 FROM json_each(p.activities) WHERE value=NEW.activity)
 AND NOT EXISTS(SELECT 1 FROM deletion_requests WHERE user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM blocks WHERE (blocker_id=NEW.owner_id AND blocked_id=u.id) OR (blocker_id=u.id AND blocked_id=NEW.owner_id))
 ORDER BY p.updated_at,p.user_id LIMIT 20;
END;
