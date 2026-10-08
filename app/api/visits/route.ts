import { getChatGPTUser } from "../../chatgpt-auth";
import { visitsDb } from "../../../db/visits";
import regions from "../../regions.json";
import universities from "../../universities.json";
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录，再保存你的蹭饭足迹。" }, { status: 401 });
  try {
    const result = await visitsDb().prepare("SELECT id, university, city_id AS cityId, created_at AS createdAt FROM visits WHERE user_id = ? ORDER BY created_at DESC").bind(user.userId).all();
    return Response.json(result.results, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Load visits failed", error);
    return Response.json({ error: "足迹暂时没能加载，请重试。" }, { status: 503 });
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录，再保存你的蹭饭足迹。" }, { status: 401 });
  let data: { university?: unknown; cityId?: unknown } | null;
  try { data = await request.json() as { university?: unknown; cityId?: unknown } | null; } catch { return Response.json({ error: "记录格式不正确。" }, { status: 400 }); }
  const university = typeof data?.university === "string" ? data.university.trim() : "";
  const cityId = typeof data?.cityId === "string" ? data.cityId : "";
  if (!university || university.length > 80 || !regions.some(r => r.id === cityId)) {
    return Response.json({ error: "请填写大学名称，并选择所在城市。" }, { status: 400 });
  }
  if (!universities.some(school => school.name === university)) return Response.json({ error: "请从大学库中选择固定校名。" }, { status: 400 });
  const record = { id: crypto.randomUUID(), university, cityId, createdAt: new Date().toISOString() };
  try {
    const result = await visitsDb().prepare("INSERT INTO visits (id, user_id, university, city_id, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, university, city_id) DO NOTHING").bind(record.id, user.userId, record.university, record.cityId, record.createdAt).run();
    if (!result.meta.changes) return Response.json({ error: "这所大学在这座城市已经点亮啦。" }, { status: 409 });
    return Response.json(record, { status: 201 });
  } catch (error) {
    console.error("Save visit failed", error);
    return Response.json({ error: "这次没能保存，填写的内容还在，请重试。" }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "请选择一条足迹。" }, { status: 400 });
  try {
    await visitsDb().prepare("DELETE FROM visits WHERE id = ? AND user_id = ?").bind(id, user.userId).run();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete visit failed", error);
    return Response.json({ error: "暂时没能删除，请重试。" }, { status: 503 });
  }
}
