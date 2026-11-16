"""Small catalogue server. Set ADMIN_PASSWORD and run `python3 server.py`.
Use HTTPS at the reverse proxy for public deployments."""
import base64, hashlib, hmac, http.cookies, json, mimetypes, os, re, secrets, sqlite3, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parent
DATA=Path(os.environ.get('CATALOGUE_DATA_DIR',str(ROOT/'data'))).resolve()
PASSWORD=os.environ.get('ADMIN_PASSWORD','')
if len(PASSWORD)<12: raise SystemExit('Set ADMIN_PASSWORD to a strong password of at least 12 characters.')
SALT=secrets.token_bytes(16)
PASSWORD_HASH=hashlib.scrypt(PASSWORD.encode(),salt=SALT,n=2**14,r=8,p=1)
SESSIONS={}; ATTEMPTS={}; LOCK=threading.RLock(); DATA.mkdir(parents=True,exist_ok=True)
DB=DATA/'catalogue.sqlite3'
with sqlite3.connect(DB) as c:
 c.execute('CREATE TABLE IF NOT EXISTS catalogue (id INTEGER PRIMARY KEY CHECK (id=1), content TEXT NOT NULL)')
 c.execute('INSERT OR IGNORE INTO catalogue(id,content) VALUES(1,?)',((ROOT/'products.json').read_text(),))

def current():
 with LOCK,sqlite3.connect(DB) as c: return json.loads(c.execute('SELECT content FROM catalogue WHERE id=1').fetchone()[0])
def save(products):
 with LOCK,sqlite3.connect(DB) as c: c.execute('UPDATE catalogue SET content=? WHERE id=1',(json.dumps(products,ensure_ascii=False),))
def valid_product(p):
 if not isinstance(p,dict) or set(p)!={'id','name','category','description','price','image','badge'}:return False
 if not all(isinstance(p[k],str) for k in p):return False
 if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}',p['id']):return False
 if not 1<=len(p['name'].strip())<=80 or len(p['description'])>120 or p['category'] not in {'Decor','Living','Dining','Lighting'}:return False
 if len(p['price'])>30 or not re.fullmatch(r'₹[0-9,.]+',p['price']) or len(p['badge'])>30:return False
 image=p['image']
 if image.startswith('data:image/jpeg;base64,'):
  try:
   decoded=base64.b64decode(image.split(',',1)[1],validate=True)
   return len(decoded)<800_000 and decoded[:3]==b'\xff\xd8\xff'
  except Exception:return False
 return bool(re.fullmatch(r'images/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp|svg)',image)) and '..' not in image

class Handler(BaseHTTPRequestHandler):
 def log_message(self, fmt, *args): pass
 def json(self,status,obj,cookie=None):
  body=json.dumps(obj,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
  if cookie:self.send_header('Set-Cookie',cookie)
  self.end_headers();self.wfile.write(body)
 def authenticated(self):
  try:
   c=http.cookies.SimpleCookie();c.load(self.headers.get('Cookie','')); sid=c['admin_session'].value
   with LOCK:
    expiry=SESSIONS.get(sid,0)
    if expiry>time.time():return True
    SESSIONS.pop(sid,None)
  except (KeyError,http.cookies.CookieError):pass
  return False
 def same_origin(self):
  origin=self.headers.get('Origin')
  return not origin or (urlsplit(origin).netloc==self.headers.get('Host') and urlsplit(origin).scheme in ('http','https'))
 def body(self):
  if 'application/json' not in self.headers.get('Content-Type',''):raise ValueError('JSON required')
  n=int(self.headers.get('Content-Length','0'))
  if n<=0 or n>20_000_000:raise ValueError('Invalid request size')
  return json.loads(self.rfile.read(n))
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/api/products':return self.json(200,current())
  if path=='/api/session':return self.json(200,{'authenticated':self.authenticated()})
  if path=='/':path='/index.html'
  decoded=unquote(path).lstrip('/')
  if decoded not in {'index.html','collection.html','admin.html','admin.css','admin.js','style.css','script.js'} and not decoded.startswith('images/'):
   return self.send_error(404)
  file=(ROOT/decoded).resolve()
  if not file.is_relative_to(ROOT) or not file.is_file():return self.send_error(404)
  if decoded.startswith('images/') and not file.is_relative_to((ROOT/'images').resolve()):return self.send_error(404)
  body=file.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(body)));self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-cache');self.end_headers();self.wfile.write(body)
 def do_POST(self):
  if not self.same_origin():return self.json(403,{'error':'Invalid request origin'})
  try: data=self.body()
  except (ValueError,json.JSONDecodeError):return self.json(400,{'error':'Invalid request'})
  path=urlsplit(self.path).path
  if path=='/api/login':
   ip=self.client_address[0];now=time.time()
   with LOCK:
    attempts=[t for t in ATTEMPTS.get(ip,[]) if now-t<900];ATTEMPTS[ip]=attempts
    if len(attempts)>=8:return self.json(429,{'error':'Too many attempts. Please try again in 15 minutes.'})
   candidate=data.get('password','') if isinstance(data,dict) else ''
   if not isinstance(candidate,str) or len(candidate)>256: candidate=''
   digest=hashlib.scrypt(candidate.encode(),salt=SALT,n=2**14,r=8,p=1)
   if not hmac.compare_digest(digest,PASSWORD_HASH):
    with LOCK:ATTEMPTS[ip].append(now)
    return self.json(401,{'error':'Incorrect password.'})
   sid=secrets.token_urlsafe(32)
   with LOCK:SESSIONS[sid]=now+8*3600;ATTEMPTS.pop(ip,None)
   secure='; Secure' if self.headers.get('X-Forwarded-Proto','').lower()=='https' else ''
   return self.json(200,{'authenticated':True},f'admin_session={sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800{secure}')
  if path=='/api/logout':
   try:
    c=http.cookies.SimpleCookie();c.load(self.headers.get('Cookie',''));sid=c['admin_session'].value
    with LOCK:SESSIONS.pop(sid,None)
   except (KeyError,http.cookies.CookieError):pass
   return self.json(200,{'ok':True},'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
  return self.json(404,{'error':'Not found'})
 def do_PUT(self):
  if urlsplit(self.path).path!='/api/products':return self.json(404,{'error':'Not found'})
  if not self.same_origin():return self.json(403,{'error':'Invalid request origin'})
  if not self.authenticated():return self.json(401,{'error':'Please sign in as admin to make changes.'})
  try: data=self.body()
  except (ValueError,json.JSONDecodeError):return self.json(400,{'error':'Invalid request'})
  if not isinstance(data,list) or len(data)>500 or not all(valid_product(p) for p in data) or len({p['id'] for p in data})!=len(data):return self.json(400,{'error':'Invalid product data. Please check the fields or image size.'})
  save(data);return self.json(200,{'ok':True})

if __name__=='__main__':
 port=int(os.environ.get('PORT','8002'));print(f'Catalogue server listening on {port}',flush=True)
 ThreadingHTTPServer(('0.0.0.0',port),Handler).serve_forever()
