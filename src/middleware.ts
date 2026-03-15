import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname === '/admin/login' ||
    request.nextUrl.pathname === '/admin/signup' ||
    request.nextUrl.pathname === '/admin/forgot-password' ||
    request.nextUrl.pathname === '/admin/reset-password';
  const isPendingPage = request.nextUrl.pathname === '/admin/pending';

  // Not logged in — allow auth pages, redirect everything else to login
  if (!user) {
    if (isAuthPage) return supabaseResponse;
    if (isPendingPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // User is logged in
  const role = user.user_metadata?.role;
  const isApproved = role === 'approved' || role === 'admin';
  const isParent = role === 'parent';

  // Logged in but pending approval (not approved, admin, or parent)
  if (!isApproved && !isParent) {
    // Allow access to pending page and auth pages only
    if (isPendingPage) return supabaseResponse;
    if (isAuthPage) return supabaseResponse;
    // Redirect everything else to pending
    const url = request.nextUrl.clone();
    url.pathname = '/admin/pending';
    return NextResponse.redirect(url);
  }

  // Parent role — restrict to gallery, highlights, and players (view only)
  if (isParent) {
    const parentAllowed = ['/admin', '/admin/gallery', '/admin/highlights', '/admin/players'];
    const currentPath = request.nextUrl.pathname;
    const isAllowed = parentAllowed.some(
      (path) => currentPath === path || (path !== '/admin' && currentPath.startsWith(path + '/'))
    );

    if (isAuthPage || isPendingPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    if (!isAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Approved user trying to visit auth/pending pages — redirect to dashboard
  if (isAuthPage || isPendingPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*'],
};
