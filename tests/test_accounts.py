import base64,json,sqlite3,tempfile,time,unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from accounts import Accounts

class AccountTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.store=Accounts(Path(self.tmp.name)/'accounts.db')
        self.user,self.cookie=self.store.register({'account':'review_user','password':'test-only-passphrase','display_name':'测试用户'})
    def tearDown(self):self.tmp.cleanup()
    def test_password_is_salted_and_not_returned(self):
        self.assertNotIn('password',self.user)
        with self.store.db() as db:row=db.execute('SELECT * FROM users').fetchone()
        self.assertNotEqual(row['password'],'test-only-passphrase');self.assertEqual(len(row['salt']),32)
    def test_login_cookie_and_logout(self):
        user,cookie=self.store.login({'account':'REVIEW_USER','password':'test-only-passphrase'})
        self.assertEqual(user['id'],self.user['id']);self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
        self.assertEqual(self.store.current(cookie)['account'],'review_user')
        self.store.logout(cookie);self.assertIsNone(self.store.current(cookie))
    def test_wrong_password_and_unknown_account(self):
        for account in ['review_user','no_such_user']:
            with self.assertRaisesRegex(ValueError,'账号或密码'):self.store.login({'account':account,'password':'wrong-value'})
    def test_duplicate_case_insensitive_account(self):
        with self.assertRaises(ValueError):self.store.register({'account':'REVIEW_USER','password':'test-only-passphrase'})
    def test_profile_persists_and_validation_is_atomic(self):
        profile={**self.user,'display_name':'海风研究者','bio':'平台响应','affiliation':'测试单位','specialty':'电气','email':'review@example.test'}
        updated=self.store.update(self.cookie,profile);self.assertEqual(updated['display_name'],'海风研究者')
        reopened=Accounts(self.store.path);self.assertEqual(reopened.current(self.cookie)['bio'],'平台响应')
        with self.assertRaises(ValueError):reopened.update(self.cookie,{**profile,'avatar':'data:image/svg+xml;base64,PHN2Zz4='})
        self.assertEqual(reopened.current(self.cookie)['bio'],'平台响应')
    def test_avatar_content_type_and_size(self):
        with self.assertRaises(ValueError):self.store.update(self.cookie,{**self.user,'avatar':'data:image/png;base64,'+base64.b64encode(b'not-a-png').decode()})
        with self.assertRaises(ValueError):self.store.update(self.cookie,{**self.user,'avatar':'x'*800000})
    def test_expired_session_and_missing_session(self):
        with self.store.db() as db:db.execute('UPDATE sessions SET expires=?',(time.time()-1,))
        self.assertIsNone(self.store.current(self.cookie))
        with self.assertRaises(PermissionError):self.store.update('',self.user)

if __name__=='__main__':unittest.main()
