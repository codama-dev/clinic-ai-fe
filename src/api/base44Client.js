import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, appBaseUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  appBaseUrl: appBaseUrl || undefined,
  token,
  functionsVersion,
  requiresAuth: false
});
