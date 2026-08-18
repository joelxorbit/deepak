import { GoogleAuth } from 'google-auth-library';
import('./config/env.js').then(async (m) => {
  const env = m.ENV;
  const auth = new GoogleAuth({
    credentials: {
      client_email: env.FIREBASE_CLIENT_EMAIL,
      private_key: env.FIREBASE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log('Successfully got token:', !!token.token);
  } catch (error) {
    console.error('Failed to get token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}).catch(console.error);
