// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // laisser passer les API
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // laisser passer la page d'accueil (qui est maintenant le login)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // rediriger /login vers / (pour compatibilité) — ne pas matcher login-*.jpg etc.
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // ici tu pourrais vérifier le cookie d'auth
  // const token = req.cookies.get('auth_token')?.value;
  // if (!token) {
  //   const url = req.nextUrl.clone();
  //   url.pathname = '/';
  //   return NextResponse.redirect(url);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)',
  ],
};
