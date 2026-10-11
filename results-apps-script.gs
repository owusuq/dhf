// Daakyehene Foundation - Results storage (Google Apps Script)
// Saves, reads and deletes result files in ONE Drive folder. The portal talks to this with a secret.
const SECRET = '5cd1d4a180041009b70361e5a53a14b0521f3dd0bc165554';
const FOLDER_ID = '1HjxSuGw1QYPS2ZdECy1MaJSCxMJ2pT7Z';

function doGet() { return out({ ok: true, info: 'Results storage is running' }); }

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.secret !== SECRET) return out({ ok: false, error: 'Wrong secret' });
    if (b.action === 'upload') {
      const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', b.name);
      const f = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
      return out({ ok: true, id: f.getId() });
    }
    if (b.action === 'get') {
      const f = inFolder(b.id);
      return out({ ok: true, name: f.getName(), mime: f.getMimeType(), data: Utilities.base64Encode(f.getBlob().getBytes()) });
    }
    if (b.action === 'delete') {
      inFolder(b.id).setTrashed(true);
      return out({ ok: true });
    }
    return out({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

// Only files inside the Results folder can be read or deleted.
function inFolder(id) {
  const f = DriveApp.getFileById(id);
  const parents = f.getParents();
  while (parents.hasNext()) { if (parents.next().getId() === FOLDER_ID) return f; }
  throw new Error('File is not in the Results folder');
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
