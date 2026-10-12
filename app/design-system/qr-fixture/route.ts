export function GET() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="black"/><path d="M8 28L20 8l12 20H8" fill="white"/></svg>',
    {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    },
  );
}
