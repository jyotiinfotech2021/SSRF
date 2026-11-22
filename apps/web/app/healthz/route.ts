// Liveness check for the hosting platform (Railway, Docker, a load balancer). It does not touch the API or the database.
export const dynamic = "force-dynamic";
export function GET() {
  return new Response("ok", { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
}
