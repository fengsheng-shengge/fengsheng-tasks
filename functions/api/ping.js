export async function onRequest() {
  return new Response(JSON.stringify({ status: "ok", time: Date.now() }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}