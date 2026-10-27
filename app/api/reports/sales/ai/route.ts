import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    if (!(await hasPermission("REPORT_SALES_VIEW"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to use the sales report." },
        { status: 403 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "OPENAI_API_KEY is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const reportData = body?.reportData;

    if (!reportData) {
      return NextResponse.json(
        { success: false, message: "Report data is required." },
        { status: 400 }
      );
    }

    const prompt = `
You are an internal business reporting assistant for Pubudu Creative Hub.
Analyze ONLY the supplied sales-report data. Do not invent figures or facts.

Write the answer in clear Sinhala with short headings and bullet points.

Include:
1. Sales summary
2. Strongest sales observations
3. Top products/services
4. Payment-method observations
5. Profit observation, but clearly state that service profit cannot be calculated from this dataset when service cost is unavailable
6. Any notable trend visible in the supplied daily data
7. 3 practical follow-up points for management

Important:
- Never change or recalculate the supplied totals unless needed to explain them.
- Clearly distinguish facts from observations.
- If there is insufficient data for a conclusion, say so.

REPORT DATA:
${JSON.stringify(reportData)}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_REPORT_MODEL || "gpt-5.6-luna",
        input: prompt,
        max_output_tokens: 1200,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("OPENAI REPORT ERROR:", json);
      return NextResponse.json(
        { success: false, message: "AI report generation failed." },
        { status: 502 }
      );
    }

    const outputText =
      Array.isArray(json.output)
        ? json.output
            .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
            .filter((item: any) => typeof item.text === "string")
            .map((item: any) => item.text)
            .join("\n")
        : "";

    if (!outputText.trim()) {
      return NextResponse.json(
        { success: false, message: "AI returned an empty report." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { summary: outputText },
    });
  } catch (error) {
    console.error("AI SALES REPORT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Unable to generate AI sales report." },
      { status: 500 }
    );
  }
}
