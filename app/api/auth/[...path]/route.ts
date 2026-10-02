import { getAuth } from "@/lib/auth/server";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: AuthRouteContext) {
  const handlers = getAuth().handler();
  return handlers.GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const handlers = getAuth().handler();
  return handlers.POST(request, context);
}
