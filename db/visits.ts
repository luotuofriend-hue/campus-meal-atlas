import { env } from "cloudflare:workers";
export function visitsDb() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
