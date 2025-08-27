import Stripe from 'stripe';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = Promise.resolve(
      new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-07-30.basil',
      })
    );
  }
  return stripePromise;
};

export default getStripe;

// Helper function to format amount for Stripe (convert to cents)
export const formatAmountForStripe = (amount: number, currency: string): number => {
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  const multiplier = currencies.includes(currency.toUpperCase()) ? 100 : 1;
  return Math.round(amount * multiplier);
};

// Helper function to format amount from Stripe (convert from cents)
export const formatAmountFromStripe = (amount: number, currency: string): number => {
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  const divisor = currencies.includes(currency.toUpperCase()) ? 100 : 1;
  return amount / divisor;
};
