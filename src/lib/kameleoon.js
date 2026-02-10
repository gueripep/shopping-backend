import { Environment, KameleoonClient } from '@kameleoon/nodejs-sdk';
import { KameleoonVisitorCodeManager } from '@kameleoon/nodejs-visitor-code-manager';
import { KameleoonEventSource } from '@kameleoon/nodejs-event-source';
import { KameleoonRequester } from '@kameleoon/nodejs-requester';

// Kameleoon Configuration
const SITE_CODE = 'dnkd8eslzh';
export const KAMELEOON_GOAL_ID = 406352;
const KAMELEOON_DATA_API = process.env.KAMELEOON_DATA_API || 'https://eu-data.kameleoon.io';

const credentials = {
    clientId: process.env.KAMELEOON_CLIENT_ID,
    clientSecret: process.env.KAMELEOON_CLIENT_SECRET,
};

const configuration = {
    updateInterval: 1,
    environment: Environment.Production,
};

// Initialize Kameleoon Client
export const kameleoonClient = new KameleoonClient({
    siteCode: SITE_CODE,
    credentials,
    configuration,
    externals: {
        visitorCodeManager: new KameleoonVisitorCodeManager(),
        eventSource: new KameleoonEventSource(),
        requester: new KameleoonRequester(),
    },
});

/**
 * Tracks a goal conversion using the Kameleoon Data API.
 * This is useful when you want to track conversions from the backend.
 */
export async function trackConversion(visitorCode, goalId, revenue) {
    try {
        const nonce = Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');

        const url = `${KAMELEOON_DATA_API}/visit/events?siteCode=${SITE_CODE}&visitorCode=${encodeURIComponent(visitorCode)}`;

        const payload = {
            nonce,
            eventType: 'CONVERSION',
            goalID: goalId,
            ...(revenue && { revenue: parseFloat(revenue) })
        };

        console.log(`[Kameleoon] Tracking conversion for visitor ${visitorCode}, goal ${goalId}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`[Kameleoon] ✓ Conversion tracked successfully`);
            return true;
        }

        console.error(`[Kameleoon] ✗ Failed to track conversion: ${response.status}`);
        return false;
    } catch (error) {
        console.error('[Kameleoon] ✗ Error tracking conversion:', error);
        return false;
    }
}
