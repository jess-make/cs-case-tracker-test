import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEACTIVATED_LOGIN_REASON } from "@/lib/auth/messages";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 路徑尾隨斜線改寫（避免 LINE webhook POST 收到 308）
  if (
    pathname.startsWith("/api/") &&
    pathname.endsWith("/") &&
    pathname.length > "/api/".length
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.rewrite(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname.startsWith("/login");
  const isChangePassword = pathname.startsWith("/change-password");
  const isPublic =
    isLogin ||
    isChangePassword ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".");

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_active, must_change_password, must_bind_line")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("reason", DEACTIVATED_LOGIN_REASON);
      const redirect = NextResponse.redirect(url);
      copyCookies(supabaseResponse, redirect);
      return redirect;
    }

    const mustChangePassword = profile?.must_change_password === true;
    const mustBindLine = profile?.must_bind_line === true;
    const onboardingIncomplete = mustChangePassword || mustBindLine;

    if (onboardingIncomplete && !isChangePassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      const redirect = NextResponse.redirect(url);
      copyCookies(supabaseResponse, redirect);
      return redirect;
    }

    if (!onboardingIncomplete && isChangePassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    const { data: profile } = await supabase
      .from("users")
      .select("must_change_password, must_bind_line")
      .eq("id", user.id)
      .maybeSingle();
    const onboardingIncomplete =
      profile?.must_change_password === true || profile?.must_bind_line === true;
    url.pathname = onboardingIncomplete ? "/change-password" : "/";
    const redirect = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
