let cachedToken: { token: string; expiresAt: number } | null = null;

async function getNewToken(): Promise<string> {
  const username = process.env.KILTER_USERNAME;
  const password = process.env.KILTER_PASSWORD;

  if (!username || !password) {
    throw new Error('KILTER_USERNAME and KILTER_PASSWORD env vars required');
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: 'kilter',
    username,
    password,
    scope: 'openid offline_access',
  });

  const response = await fetch(
    'https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(`Keycloak auth failed: ${response.status}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  const expiresAt = Date.now() + (data.expires_in - 30) * 1000;

  cachedToken = { token: data.access_token, expiresAt };
  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  return getNewToken();
}
