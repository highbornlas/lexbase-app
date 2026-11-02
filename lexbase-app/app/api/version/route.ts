import { APP_VERSION, BUILD_DATE } from '@/lib/version';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ version: APP_VERSION, releaseDate: BUILD_DATE }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
