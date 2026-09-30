import { identityRepository } from "@/modules/identity/repository";
import { currentUser } from "@/server/auth";
import { errorResponse, json, requireAdmin } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    requireAdmin(await currentUser());
    return json({ users: await identityRepository.listPublicUsers() });
  } catch (error) { return errorResponse(error); }
}
