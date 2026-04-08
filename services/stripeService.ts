import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

export const initializeStripePayment = async (clientSecret: string) => {
    return await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'InspectEV',
        style: 'alwaysDark',
        returnURL: 'inspectev://payment-return',
    });
};

export const presentStripePayment = async () => {
    return await presentPaymentSheet();
};
