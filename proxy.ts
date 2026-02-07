import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    // Define protected routes that require authentication
    const protectedPaths = ['/profile']

    // Check if the current path is protected
    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    // Create a response object (we'll update it with cookies)
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create Supabase client for proxy
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // Check authentication status
    const { data: { user }, error } = await supabase.auth.getUser()

    // If accessing a protected path without authentication, redirect to login
    if (isProtectedPath && !user) {
        const loginUrl = new URL('/login', request.url)
        // Add redirect parameter to return user after login
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Return the response with updated cookies
    return response
}

// Configure which routes the proxy should run on
export const config = {
    matcher: [
        /*
         * Only run proxy on protected routes
         * This prevents unnecessary checks on public pages
         */
        '/profile/:path*',
        '/profile/:path*',
    ],
}
