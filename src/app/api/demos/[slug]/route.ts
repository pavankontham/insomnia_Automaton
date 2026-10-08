import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const file = path.join(process.cwd(), "data", "demos", slug, "index.html");
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: "Demo not found" }, { status: 404 });
  }
  const html = fs.readFileSync(file, "utf8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
