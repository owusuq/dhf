// Colour + label for a student's fee progress: gold when nothing is paid, green when fully paid.
export function feeInfo(total, owing, pct) {
  const st = owing <= 0 ? 'paid' : pct > 0 ? 'part' : 'owing';
  const hue = st === 'paid' ? 140 : Math.round(43 + pct * 0.9);
  return {
    cls: st,
    label: st === 'paid' ? 'Paid' : st === 'part' ? 'Part paid' : 'Owing',
    bg: 'linear-gradient(90deg,hsl(' + hue + ',72%,42%),hsl(' + (hue + 8) + ',78%,55%))',
  };
}
