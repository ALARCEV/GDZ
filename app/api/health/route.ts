import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "school-assistant-mvp",
    timestamp: new Date().toISOString()
  });
}
