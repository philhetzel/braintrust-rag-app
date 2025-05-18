import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Span, startSpan, initLogger } from 'braintrust';
import { cookies } from 'next/headers';

// Global span store
export const spanStore = new Map<string, Span>();

const SESSION_COOKIE_NAME = 'session_id_PhilCookie';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

interface Session {
    id: string;
    createdAt: number;
    lastAccessed: number;
}

function getSessionFromRequest(request: NextRequest): Session | null {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
        return null;
    }

    try {
        const session = JSON.parse(sessionCookie.value) as Session;
        return session;
    } catch {
        return null;
    }
}

// function createSessionSpan(cookie: string): Span {
//     const span = startSpan({name: cookie, event:{input: "start"}});
//     spanStore.set('active_span', span);
//     return span;
// }

function createSession(): Session {
    console.log("creating session");
    return {
        id: uuidv4(),
        createdAt: Date.now(),
        lastAccessed: Date.now(),
    };
}

export async function middleware(request: NextRequest) {
    
    // Skip session management for static files and API routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    let session = getSessionFromRequest(request);
    const response = NextResponse.next();
    let parentSpanId: string;
    
    if (!session) {
        session = createSession();
        
        console.log("map", spanStore);
    } else {
        // Update last accessed time
        session.lastAccessed = Date.now();
    }

    // Set the session cookie
    response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION
    });
    
    // Set the span ID cookie
    
    
    // Add session ID to response headers for client-side access if needed
    response.headers.set('X-Session-ID', session.id);
    
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}; 

export function killSpan() {
    const span = spanStore.get("hardcode");
    console.log("span", span);
    span?.end();
}