import Whop from '@whop/sdk';

export const whopClient = new Whop({
  apiKey: process.env.WHOP_API_KEY!, // Company API Key, from Whop Dashboard > Developer
});