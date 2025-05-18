import { useState, useEffect } from 'react';

interface Session {
    id: string;
    createdAt: number;
    lastAccessed: number;
}

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get session ID from response headers
        const sessionId = document.cookie
            .split('; ')
            .find(row => row.startsWith('session_id='))
            ?.split('=')[1];

        if (sessionId) {
            try {
                const sessionData = JSON.parse(decodeURIComponent(sessionId));
                setSession(sessionData);
            } catch (error) {
                console.error('Error parsing session data:', error);
            }
        }
        
        setLoading(false);
    }, []);

    return { session, loading };
} 