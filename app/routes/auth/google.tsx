import { generateState, generateCodeVerifier } from "arctic";
import { redirect } from "react-router";
import { getGoogleOAuth } from "../../lib/auth";
import { env } from "cloudflare:workers";

export async function loader() {
  const google = getGoogleOAuth(env as any);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const scopes = ["openid", "profile", "email", "https://www.googleapis.com/auth/drive.file"];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("access_type", "offline");

  const headers = new Headers();
  headers.append("Set-Cookie", `google_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  headers.append("Set-Cookie", `google_code_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  return redirect(url.toString(), {
    headers
  });
}

