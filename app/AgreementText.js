// Shows agreement text: numbered lines like "1. Title" become headings.
export default function AgreementText({ body }) {
  const lines = String(body || '').split('\n');
  return (
    <div>
      {lines.map((l, i) => {
        if (!l.trim()) return null;
        if (/^\d+\.\s/.test(l)) return <h3 key={i} style={{ margin: '1rem 0 .2rem' }}>{l}</h3>;
        return <p key={i} style={{ margin: '.3rem 0' }}>{l}</p>;
      })}
    </div>
  );
}
