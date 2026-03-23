export const initializeStripePayment = async (clientSecret: string) => {
    return { error: { message: 'Not supported on Web', code: 'Canceled' } }; // Use Canceled to gracefully abort rather than throw loud errors
};

export const presentStripePayment = async () => {
    return { error: { message: 'Not supported on Web', code: 'Canceled' } };
};
