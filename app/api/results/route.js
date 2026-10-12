import { NextResponse } from 'next/server';
import { whoIsCalling, drive } from '../../../lib/results-server';

const MAX_BYTES = 4 * 1024 * 1024; // hosting request limit

// Admin uploads for any student; a student uploads for themselves only. The file goes to the Google Drive folder.
export async function POST(req) {
  try {
    const who = await whoIsCalling(req);
    if (who.error) return NextResponse.json({ error: who.error }, { status: who.status });
    const form = await req.formData();
    const file = form.get('file');
    // Students can only upload for themselves. Admins can choose the student.
    const userId = who.isAdmin ? String(form.get('user_id') || '') : who.user.id;
    const title = String(form.get('title') || '').trim();
    if (!file || typeof file === 'string' || !userId) {
      return NextResponse.json({ error: 'Choose a student and a file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is over 4MB. Please send a smaller PDF or image.' }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const up = await drive({
      action: 'upload',
      name: file.name,
      mime: file.type || 'application/octet-stream',
      data: bytes.toString('base64'),
    });

    const { error } = await who.admin.from('results').insert({
      user_id: userId,
      title: title || file.name,
      file_name: file.name,
      mime_type: file.type || '',
      drive_file_id: up.id,
    });
    if (error) {
      try { await drive({ action: 'delete', id: up.id }); } catch (e) { /* ignore */ }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });
  }
}
