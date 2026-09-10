"""Isolated schema tests. In-memory SQLite is used only by this test process."""
import sqlite3
import unittest
from pathlib import Path

class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        for migration in sorted(Path('migrations').glob('*.sql')):
            self.db.executescript(migration.read_text())
        for uid in ['a','b','c','d']:
            self.db.execute("INSERT INTO users(id,email,name,password_hash,dob,gender) VALUES(?,?,?,'test-only','1995-01-01','woman')", (uid,uid+'@example.test',uid))
    def booking(self, bid, requester, companion, start=100000, status='accepted'):
        self.db.execute("INSERT INTO bookings(id,requester_id,companion_id,activity,start_at,end_at,venue,introduction,status,expires_at) VALUES(?,?,?,'Coffee',?,?,'Public café','Test only',?,90000)", (bid,requester,companion,start,start+3600,status))
    def test_all_required_tables_exist(self):
        required={'users','profiles','roles','consent_records','verification_records','availability_rules','availability_exceptions','bookings','conversations','messages','payment_orders','payments','memberships','webhook_events','reviews','reports','blocks','notifications','admin_audit_logs','notification_preferences','private_plans','private_invitations'}
        found={r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertTrue(required <= found)
    def test_overlap_at_insert(self):
        self.booking('one','a','b')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_overlap'):
            self.booking('two','c','b')
    def test_overlap_across_requester_and_companion_roles(self):
        self.booking('one','a','b')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_overlap'):
            self.booking('two','b','c')
    def test_buffer_protection(self):
        self.booking('one','a','b')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_overlap'):
            self.booking('two','c','b',104500)
        self.booking('three','c','b',105400)
    def test_pending_can_overlap_but_second_acceptance_fails(self):
        self.booking('one','a','b',status='pending')
        self.booking('two','c','b',status='pending')
        self.db.execute("UPDATE bookings SET status='accepted' WHERE id='one'")
        with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_overlap'):
            self.db.execute("UPDATE bookings SET status='accepted' WHERE id='two'")
        self.assertEqual(self.db.execute("SELECT status FROM bookings WHERE id='two'").fetchone()[0],'pending')
    def test_cancellation_releases_slot(self):
        self.booking('one','a','b')
        self.db.execute("UPDATE bookings SET status='cancelled' WHERE id='one'")
        self.booking('two','c','b')
    def test_unique_pending_payment_order(self):
        self.db.execute("INSERT INTO payment_orders VALUES('order1','a',29900,'INR','created',100)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO payment_orders VALUES('order2','a',29900,'INR','created',101)")
    def test_webhook_event_deduplication(self):
        for _ in range(2):
            self.db.execute("INSERT OR IGNORE INTO webhook_events(id,event_type) VALUES('same-event','payment.captured')")
        self.assertEqual(self.db.execute('SELECT count(*) FROM webhook_events').fetchone()[0],1)
    def test_self_booking_and_self_block_denied(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.booking('one','a','a')
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO blocks(blocker_id,blocked_id) VALUES('a','a')")
    def test_relational_integrity(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.booking('one','missing','b')

if __name__ == '__main__':
    unittest.main(verbosity=2)
