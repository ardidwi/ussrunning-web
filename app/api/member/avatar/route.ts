import { avatarStorage } from "@/lib/member/avatar-storage";
import { requireCompleteMember } from "@/lib/member/complete-member";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const expectedId = new URL(request.url).searchParams.get("id");
  try {
    const { avatar } = await requireCompleteMember();
    if (!avatar || avatar.id !== expectedId || avatar.provider !== avatarStorage.id || !avatarStorage.getPrivate) {
      return new Response(null, { status: 404, headers });
    }
    const bytes = await avatarStorage.getPrivate(avatar.storageKey);
    return new Response(Uint8Array.from(bytes).buffer, { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
