import { redirect } from "react-router";
import { getGoogleOAuth, createSessionToken } from "../../lib/auth";
import { env } from "cloudflare:workers";
import { getUserByGoogleId, createUser } from "../../lib/db";
import type { Route } from "./+types/google-callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => c.trim().split("="))
  );
  
  const storedState = cookies["google_oauth_state"];
  const codeVerifier = cookies["google_code_verifier"];

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return new Response("Invalid state or code", { status: 400 });
  }

  const google = getGoogleOAuth(env as any);
  
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();


    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const user: any = await response.json();

    const allowedEmails = ((env as any).ALLOWED_EMAILS || "").split(";").map((e: string) => e.trim().toLowerCase());
    if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase())) {
      return new Response("Access Denied: Email not authorized.", { status: 403 });
    }

    let dbUser: any = await getUserByGoogleId(user.sub);

    if (!dbUser) {
      const userId = crypto.randomUUID();
      await createUser({
        id: userId,
        googleId: user.sub,
        email: user.email,
        name: user.name,
        avatar: user.picture,
      });
      dbUser = { id: userId };
    }

    const sessionToken = await createSessionToken(dbUser.id, accessToken, (env as any).JWT_SECRET);

    return redirect("/", {
      headers: {
        "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Authentication failed", { status: 500 });
  }
}
