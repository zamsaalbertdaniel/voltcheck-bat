/**
 * VoltCheck — Stripe Web Payment Service
 * Uses @stripe/stripe-js for web platform payments
 *
 * Flow:
 *   1. Load Stripe.js (singleton)
 *   2. Create Elements with clientSecret
 *   3. Mount Payment Element to DOM
 *   4. Confirm payment
 */

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

// ── Singleton Stripe instance ────────────────────────────────────────────────

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
    if (!stripePromise) {
        if (!STRIPE_PK) {
            console.error('[Stripe Web] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set');
            return Promise.resolve(null);
        }
        stripePromise = loadStripe(STRIPE_PK);
    }
    return stripePromise;
}

// ── Active Elements tracking ─────────────────────────────────────────────────

let activeElements: StripeElements | null = null;

/**
 * Initialize Stripe payment on web.
 * Creates a Payment Element that can be mounted to a DOM container.
 *
 * @param clientSecret - The PaymentIntent client secret from backend
 * @returns Object with mount/unmount helpers and confirm function
 */
export const initializeStripePayment = async (clientSecret: string): Promise<{
    error?: { message: string; code: string };
    mount?: (containerId: string) => void;
    unmount?: () => void;
    confirm?: () => Promise<{ error?: { message: string; code: string }; success?: boolean }>;
}> => {
    const stripe = await getStripe();

    if (!stripe) {
        return {
            error: {
                message: 'Stripe is not configured for web payments',
                code: 'stripe_not_configured',
            },
        };
    }

    try {
        const elements = stripe.elements({
            clientSecret,
            appearance: {
                theme: 'night',
                variables: {
                    colorPrimary: '#39FF14',
                    colorBackground: '#1A1A2E',
                    colorText: '#E8E8E8',
                    colorDanger: '#FF4444',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRadius: '12px',
                },
            },
        });

        activeElements = elements;

        const paymentElement = elements.create('payment', {
            layout: 'tabs',
        });

        return {
            mount: (containerId: string) => {
                const container = document.getElementById(containerId);
                if (container) {
                    paymentElement.mount(container);
                } else {
                    console.error(`[Stripe Web] Container #${containerId} not found`);
                }
            },
            unmount: () => {
                paymentElement.unmount();
                activeElements = null;
            },
            confirm: async () => {
                const { error } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: `${window.location.origin}/payment/complete`,
                    },
                    redirect: 'if_required',
                });

                if (error) {
                    return {
                        error: {
                            message: error.message || 'Payment failed',
                            code: error.code || 'payment_failed',
                        },
                    };
                }

                return { success: true };
            },
        };
    } catch (err: any) {
        return {
            error: {
                message: err.message || 'Failed to initialize payment',
                code: 'initialization_failed',
            },
        };
    }
};

/**
 * Present Stripe payment sheet (web version).
 * On web, payment is confirmed via the confirm() function returned by initializeStripePayment.
 * This function is provided for API compatibility with the native version.
 */
export const presentStripePayment = async (): Promise<{
    error?: { message: string; code: string };
}> => {
    if (!activeElements) {
        return {
            error: {
                message: 'Payment not initialized. Call initializeStripePayment first.',
                code: 'not_initialized',
            },
        };
    }

    // On web, the Payment Element is already mounted and interactive.
    // Confirmation happens via the confirm() method from initializeStripePayment.
    return {};
};
