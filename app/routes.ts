import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login/google", "routes/auth/google.tsx"),
  route("login/google/callback", "routes/auth/google-callback.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("edit/:date", "routes/edit-day.tsx"),
] satisfies RouteConfig;
