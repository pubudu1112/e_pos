
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!(await hasPermission("SMART_FORECAST_VIEW"))) {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 }
            );
        }

        const events = await prisma.businessEvent.findMany({
            orderBy: {
                startDate: "asc",
            },
        });

        return NextResponse.json({
            success: true,
            data: events,
        });
    } catch (error) {
        console.error("BUSINESS EVENTS GET ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to retrieve business events.",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        const title = String(body.title ?? "").trim();
        const eventType = String(body.eventType ?? "").trim();
        const description = body.description
            ? String(body.description).trim()
            : null;

        if (!title || !eventType || !body.startDate || !body.endDate) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Title, event type, start date and end date are required.",
                },
                { status: 400 }
            );
        }

        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate < startDate
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid event dates.",
                },
                { status: 400 }
            );
        }

        const event = await prisma.businessEvent.create({
            data: {
                title,
                description,
                eventType,
                startDate,
                endDate,
                isActive: body.isActive !== false,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Business event created successfully.",
                data: event,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("BUSINESS EVENTS POST ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to create business event.",
            },
            { status: 500 }
        );
    }
}
