import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

export const initializeStripePayment = async (clientSecret: string) => {
    return await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'VoltCheck',
        style: 'alwaysDark',
        returnURL: 'voltcheck://payment-return',
    });
};

export const presentStripePayment = async () => {
    return await presentPaymentSheet();
};
