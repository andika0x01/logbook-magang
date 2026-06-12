import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/spaces.tsx"),
  route("u/:userId", "routes/home.tsx"),
  route("u/:userId/edit/:date", "routes/edit-day.tsx"),
  route("login/google", "routes/auth/google.tsx"),
  route("login/google/callback", "routes/auth/google-callback.tsx"),
  route("logout", "routes/auth/logout.tsx"),
] satisfies RouteConfig;
