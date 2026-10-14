// Friendly "nothing here yet" message with an icon.
export default function Empty({ icon = '📭', title, hint }) {
  return (
    <div className="empty">
      <div className="empty-ic" aria-hidden="true">{icon}</div>
      <p className="empty-t">{title}</p>
      {hint && <p className="empty-h">{hint}</p>}
    </div>
  );
}
