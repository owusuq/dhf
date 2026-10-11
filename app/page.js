const fs = require('fs');
const f = 'app/page.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('async function destination')) { console.log('Already patched.'); process.exit(0); }

const helper = `
async function destination(uid) {
  if (!takeApply()) return '/dashboard';
  const a = await supabase.from('applications').select('id').eq('user_id', uid).eq('program', 'Daakyehene Foundation').maybeSingle();
  return a.data ? '/dashboard' : '/apply';
}
`;
s = s.replace("\nexport default function Login()", helper + "\nexport default function Login()");

const a1 = "supabase.auth.getSession().then(({ data }) => data.session && router.replace(takeApply() ? '/apply' : '/dashboard'));";
const b1 = "supabase.auth.getSession().then(async ({ data }) => { if (data.session) router.replace(await destination(data.session.user.id)); });";
const a2 = "    router.replace(takeApply() ? '/apply' : '/dashboard');\n  }\n  function startApply";
const b2 = "    router.replace(await destination(res.data.session.user.id));\n  }\n  function startApply";
if (!s.includes(a1) || !s.includes(a2)) { console.error('Pattern not found. No changes made.'); process.exit(1); }
s = s.replace(a1, b1).replace(a2, b2);
fs.writeFileSync(f, s);
console.log('Patched app/page.js');
