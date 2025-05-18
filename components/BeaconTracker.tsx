'use client';

import { useEffect } from 'react';

export function BeaconTracker() {
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Get the current span ID from cookies
            const spanId = document.cookie
                .split('; ')
                .find(row => row.startsWith('span_id='))
                ?.split('=')[1];

            if (spanId) {
                // Send a beacon to your API endpoint
                navigator.sendBeacon('/api/beacon', JSON.stringify({
                    spanId,
                    event: 'page_close',
                    timestamp: Date.now()
                }));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return null; // This component doesn't render anything
} 