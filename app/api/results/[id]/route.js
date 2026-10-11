import { NextResponse } from 'next/server';
import { whoIsCalling, drive } from '../../../../lib/results-server';

// Finds the result and checks the caller may use it (owner or admin).
async function open(req, params) {
  const who = await whoIsCalling(req);
  if (who.error) return { res: NextResponse.json({ error: who.error }, { status: who.status }) };
  const { data: row } = await who.admin.from('results').select('*').eq('id', params.id).single();
  if (!row || (!who.isAdmin && row.user_id !== who.user.id)) {
    return { res: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { who, row };
}

// View a result (student sees their own, admin sees any).
export async function GET(req, { params }) {
  try {
    const { res, row } = await open(req, params);
    if (res) return res;
    const f = await drive({ action: 'get', id: row.drive_file_id });
    return new Response(Buffer.from(f.data, 'base64'), {
      headers: {
        'Content-Type': row.mime_type || f.mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });
  }
}

// Admin renames a result.
export async function PATCH(req, { params }) {
  try {
    const { res, who, row } = await open(req, params);
    if (res) return res;
    if (!who.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    const { title } = await req.json();
    if (!title || !String(title).trim()) return NextResponse.json({ error: 'Title is empty' }, { status: 400 });
    const { error } = await who.admin.from('results').update({ title: String(title).trim() }).eq('id', row.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });
  }
}

// Admin deletes a result (file goes to the Drive trash, row is removed).
export async function DELETE(req, { params }) {
  try {
    const { res, who, row } = await open(req, params);
    if (res) return res;
    if (!who.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    try { await drive({ action: 'delete', id: row.drive_file_id }); } catch (e) { /* file may already be gone */ }
    const { error } = await who.admin.from('results').delete().eq('id', row.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });
  }
}
