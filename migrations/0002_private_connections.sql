-- No public person directory, including previously approved profiles.
UPDATE profiles SET visible=0;
CREATE TABLE notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 city TEXT NOT NULL,
 activities TEXT NOT NULL CHECK(json_valid(activities)),
 consent_version TEXT NOT NULL DEFAULT 'private-notifications-v1',
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE private_plans (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES users(id),
 city TEXT NOT NULL,
 activity TEXT NOT NULL,
 start_at INTEGER NOT NULL,
 end_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','cancelled')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 CHECK(end_at>start_at)
);
CREATE INDEX private_plans_owner ON private_plans(owner_id,created_at);
CREATE TABLE private_invitations (
 id TEXT PRIMARY KEY,
 plan_id TEXT NOT NULL REFERENCES private_plans(id),
 recipient_id TEXT NOT NULL REFERENCES users(id),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','interested','declined')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 responded_at INTEGER,
 UNIQUE(plan_id,recipient_id)
);
CREATE INDEX private_invitations_recipient ON private_invitations(recipient_id,state);
ALTER TABLE notifications ADD COLUMN invitation_id TEXT REFERENCES private_invitations(id);
CREATE UNIQUE INDEX notification_once ON notifications(invitation_id,user_id,kind) WHERE invitation_id IS NOT NULL;
CREATE INDEX notifications_inbox ON notifications(user_id,created_at);
-- Matching is opt-in and is performed atomically with creating a private plan.
-- Notification payloads never contain a member name, contact detail or photo.
CREATE TRIGGER private_plan_match AFTER INSERT ON private_plans BEGIN
 INSERT INTO private_invitations(id,plan_id,recipient_id)
 SELECT lower(hex(randomblob(16))),NEW.id,p.user_id
 FROM notification_preferences p JOIN users u ON u.id=p.user_id JOIN memberships m ON m.user_id=u.id
 WHERE p.enabled=1 AND p.city=NEW.city AND u.id<>NEW.owner_id
 AND u.email_verified=1 AND u.adult_verified=1 AND u.suspended=0 AND m.status='active'
 AND EXISTS(SELECT 1 FROM json_each(p.activities) WHERE value=NEW.activity)
 AND NOT EXISTS(SELECT 1 FROM deletion_requests WHERE user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM blocks WHERE (blocker_id=NEW.owner_id AND blocked_id=u.id) OR (blocker_id=u.id AND blocked_id=NEW.owner_id))
 ORDER BY p.updated_at,p.user_id LIMIT 20;
END;
CREATE TRIGGER private_invitation_notify AFTER INSERT ON private_invitations BEGIN
 INSERT INTO notifications(id,user_id,kind,body,invitation_id)
 VALUES(lower(hex(randomblob(16))),NEW.recipient_id,'private_interest','Someone would like to meet for a platonic activity. Review the private plan when you are ready.',NEW.id);
END;
CREATE TRIGGER private_interest_reply AFTER UPDATE OF state ON private_invitations
WHEN OLD.state='pending' AND NEW.state='interested' BEGIN
 INSERT INTO notifications(id,user_id,kind,body,invitation_id)
 SELECT lower(hex(randomblob(16))),owner_id,'private_reply','Someone is interested in your plan. This is not a confirmed meeting; identities and contact details remain private.',NEW.id FROM private_plans WHERE id=NEW.plan_id;
END;
