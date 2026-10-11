import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Draws the foundation logo on a navy square, as a PNG, for the home-screen icon.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const size = Number(searchParams.get('size')) === 512 ? 512 : 192;
  const inner = Math.round(size * 0.82);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b2540',
        }}
      >
        <img
          src={origin + '/logo.jpeg'}
          width={inner}
          height={inner}
          style={{ borderRadius: inner / 2, objectFit: 'cover' }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
