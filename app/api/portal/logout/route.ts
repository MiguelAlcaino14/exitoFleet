export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('portal_token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
