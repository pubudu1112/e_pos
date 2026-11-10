import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/* ============================================================
   HELPERS
============================================================ */

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function startOfDay(date: Date): Date {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

function startOfMonth(date: Date): Date {
  const result = new Date(date);

  result.setDate(1);
  result.setHours(0, 0, 0, 0);

  return result;
}

function startOfYear(date: Date): Date {
  const result = new Date(date);

  result.setMonth(0);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);

  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);

  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getPercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

/* ============================================================
   PERIOD TYPES
============================================================ */

type DashboardPeriod =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "year";

/* ============================================================
   GET DASHBOARD DATA
============================================================ */

export async function GET(request: NextRequest) {
  try {
    /* ========================================================
       AUTHENTICATION
    ======================================================== */

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    /* ========================================================
       REQUEST PARAMETERS
    ======================================================== */

    const searchParams = request.nextUrl.searchParams;

    const requestedPeriod =
      searchParams.get("period") as DashboardPeriod | null;

    const allowedPeriods: DashboardPeriod[] = [
      "today",
      "7days",
      "30days",
      "month",
      "year",
    ];

    const period: DashboardPeriod =
      requestedPeriod &&
        allowedPeriods.includes(requestedPeriod)
        ? requestedPeriod
        : "7days";

    /* ========================================================
       CURRENT DATE
    ======================================================== */

    const now = new Date();

    const todayStart = startOfDay(now);

    const tomorrowStart = addDays(todayStart, 1);

    const yesterdayStart = addDays(todayStart, -1);

    /* ========================================================
       SELECT DASHBOARD PERIOD
    ======================================================== */

    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case "today":
        periodStart = todayStart;
        periodEnd = tomorrowStart;
        break;

      case "30days":
        periodStart = addDays(todayStart, -29);
        periodEnd = tomorrowStart;
        break;

      case "month":
        periodStart = startOfMonth(now);
        periodEnd = tomorrowStart;
        break;

      case "year":
        periodStart = startOfYear(now);
        periodEnd = tomorrowStart;
        break;

      case "7days":
      default:
        periodStart = addDays(todayStart, -6);
        periodEnd = tomorrowStart;
        break;
    }

    /* ========================================================
       PREVIOUS PERIOD
    ======================================================== */

    const periodMilliseconds =
      periodEnd.getTime() - periodStart.getTime();

    const previousPeriodEnd = new Date(periodStart);

    const previousPeriodStart = new Date(
      periodStart.getTime() - periodMilliseconds
    );

    /* ========================================================
       TODAY SALES
    ======================================================== */

    /* ========================================================
       PARALLEL DATABASE QUERIES
    ======================================================== */

    const [
      todaySalesAggregate,
      yesterdaySalesAggregate,
      periodSalesAggregate,
      previousPeriodSalesAggregate,
      totalProducts,
      productsWithStock,
      salesOverview,
      categoryRows,
      paymentRows,
      topSellingRows,
      recentSales,
      paymentStatusRows,
    ] = await Promise.all([
      // 1. Today sales
      prisma.sale.aggregate({
        where: {
          saleDate: {
            gte: todayStart,
            lt: tomorrowStart,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
        _count: {
          _all: true,
        },
      }),

      // 2. Yesterday sales
      prisma.sale.aggregate({
        where: {
          saleDate: {
            gte: yesterdayStart,
            lt: todayStart,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // 3. Selected period sales
      prisma.sale.aggregate({
        where: {
          saleDate: {
            gte: periodStart,
            lt: periodEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
        _count: {
          _all: true,
        },
      }),

      // 4. Previous period sales
      prisma.sale.aggregate({
        where: {
          saleDate: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // 5. Total active products
      prisma.product.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // 6. Products with stock
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          code: true,
          name: true,
          minimumStock: true,
          stock: {
            select: {
              quantity: true,
              reservedQuantity: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      }),

      // 7. Sales overview by day
      prisma.sale.findMany({
        where: {
          saleDate: {
            gte: periodStart,
            lt: periodEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          saleDate: true,
          total: true,
        },
        orderBy: {
          saleDate: "asc",
        },
      }),

      // 8. Sales by Product & Service Category
      prisma.saleitem.findMany({
        where: {
          sale: {
            saleDate: {
              gte: periodStart,
              lt: periodEnd,
            },
            status: {
              not: "CANCELLED",
            },
          },
          OR: [
            {
              productId: {
                not: null,
              },
            },
            {
              serviceId: {
                not: null,
              },
            },
          ],
        },
        select: {
          total: true,

          product: {
            select: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },

          service: {
            select: {
              servicecategory: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),

      // 9. Payments by method
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: periodStart,
            lt: periodEnd,
          },
          sale: {
            status: {
              not: "CANCELLED",
            },
          },
        },
        select: {
          amount: true,
          paymentmethod: {
            select: {
              name: true,
            },
          },
        },
      }),

      // 10. Top selling products
      prisma.saleitem.findMany({
        where: {
          sale: {
            saleDate: {
              gte: periodStart,
              lt: periodEnd,
            },
            status: {
              not: "CANCELLED",
            },
          },
        },
        select: {
          quantity: true,
          total: true,
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),

      // 11. Recent sales
      prisma.sale.findMany({
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        orderBy: {
          saleDate: "desc",
        },
        take: 10,
        select: {
          id: true,
          invoiceNo: true,
          saleDate: true,
          total: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
          paymentStatus: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),

      // 12. Payment status summary
      prisma.sale.groupBy({
        by: ["paymentStatus"],
        where: {
          saleDate: {
            gte: periodStart,
            lt: periodEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          total: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
    ]);

    /* ========================================================
       PROCESS SUMMARY METRICS
    ======================================================== */

    const todaySales = toNumber(
      todaySalesAggregate._sum.total
    );

    const todayPaid = toNumber(
      todaySalesAggregate._sum.paidAmount
    );

    const todayOrders =
      todaySalesAggregate._count._all;

    const yesterdaySales = toNumber(
      yesterdaySalesAggregate._sum.total
    );

    const yesterdayOrders =
      yesterdaySalesAggregate._count._all;

    const salesChange = getPercentageChange(
      todaySales,
      yesterdaySales
    );

    const ordersChange = getPercentageChange(
      todayOrders,
      yesterdayOrders
    );

    const periodSales = toNumber(
      periodSalesAggregate._sum.total
    );

    const periodPaid = toNumber(
      periodSalesAggregate._sum.paidAmount
    );

    const periodOrders =
      periodSalesAggregate._count._all;

    const previousPeriodSales = toNumber(
      previousPeriodSalesAggregate._sum.total
    );

    const previousPeriodOrders =
      previousPeriodSalesAggregate._count._all;

    const periodSalesChange =
      getPercentageChange(
        periodSales,
        previousPeriodSales
      );

    const periodOrdersChange =
      getPercentageChange(
        periodOrders,
        previousPeriodOrders
      );

    /* ========================================================
       PROCESS STOCK
    ======================================================== */

    const stockProducts =
      productsWithStock.map((product) => {
        const quantity = toNumber(
          product.stock?.quantity
        );

        const reservedQuantity = toNumber(
          product.stock?.reservedQuantity
        );

        const available = Math.max(
          quantity - reservedQuantity,
          0
        );

        const minimumStock = toNumber(
          product.minimumStock
        );

        const stockPercentage =
          minimumStock > 0
            ? (available / minimumStock) * 100
            : 100;

        let stockStatus:
          | "OUT_OF_STOCK"
          | "CRITICAL"
          | "LOW"
          | "NORMAL";

        if (available <= 0) {
          stockStatus = "OUT_OF_STOCK";
        } else if (available < minimumStock * 0.5) {
          stockStatus = "CRITICAL";
        } else if (available <= minimumStock) {
          stockStatus = "LOW";
        } else {
          stockStatus = "NORMAL";
        }

        return {
          id: product.id,
          code: product.code,
          name: product.name,
          quantity,
          reservedQuantity,
          available,
          minimumStock,
          stockPercentage,
          stockStatus,
        };
      });

    const lowStockProducts =
      stockProducts
        .filter(
          (product) =>
            product.available <=
            product.minimumStock
        )
        .sort(
          (a, b) =>
            a.available -
            b.available
        );

    const outOfStockProducts =
      stockProducts.filter(
        (product) =>
          product.available <= 0
      );

    /* ========================================================
       PROCESS SALES OVERVIEW
    ======================================================== */

    const salesByDayMap =
      new Map<string, number>();

    for (const sale of salesOverview) {
      const dateKey = formatDate(
        new Date(sale.saleDate)
      );

      const current =
        salesByDayMap.get(dateKey) || 0;

      salesByDayMap.set(
        dateKey,
        current + toNumber(sale.total)
      );
    }

    const salesByDay: Array<{
      date: string;
      sales: number;
    }> = [];

    const cursorDate = new Date(
      periodStart
    );

    while (
      cursorDate < periodEnd
    ) {
      const dateKey =
        formatDate(cursorDate);

      salesByDay.push({
        date: dateKey,
        sales:
          salesByDayMap.get(
            dateKey
          ) || 0,
      });

      cursorDate.setDate(
        cursorDate.getDate() + 1
      );
    }

    /* ========================================================
   PROCESS SALES BY PRODUCT & SERVICE CATEGORY
======================================================== */

    const categoryMap = new Map<string, number>();

    for (const row of categoryRows) {
      let categoryName = "Other";

      // Product Category
      if (row.product) {
        categoryName = `Product - ${row.product.category?.name || "Other"
          }`;
      }

      // Service Category
      else if (row.service) {
        categoryName = `Service - ${row.service.servicecategory?.name || "Other"
          }`;
      }

      const current =
        categoryMap.get(categoryName) || 0;

      categoryMap.set(
        categoryName,
        current + toNumber(row.total)
      );
    }

    const salesByCategory = Array.from(
      categoryMap.entries()
    )
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    /* ========================================================
       PROCESS PAYMENT METHODS
    ======================================================== */

    const paymentMap =
      new Map<string, number>();

    for (const payment of paymentRows) {
      const method =
        payment.paymentmethod?.name ||
        "Unknown";

      const current =
        paymentMap.get(method) || 0;

      paymentMap.set(
        method,
        current + toNumber(payment.amount)
      );
    }

    const paymentMethods =
      Array.from(
        paymentMap.entries()
      )
        .map(
          ([name, value]) => ({
            name,
            value,
          })
        )
        .sort(
          (a, b) =>
            b.value - a.value
        );

    const totalPayments =
      paymentMethods.reduce(
        (sum, item) =>
          sum + item.value,
        0
      );

    /* ========================================================
       PROCESS TOP SELLING PRODUCTS
    ======================================================== */

    const topSellingMap =
      new Map<
        string,
        {
          id: number | null;
          code: string | null;
          name: string;
          type: "PRODUCT" | "SERVICE";
          quantity: number;
          revenue: number;
        }
      >();

    for (const row of topSellingRows) {
      const name =
        row.product?.name ||
        row.service?.name ||
        "Unknown";

      const type = row.product
        ? "PRODUCT"
        : "SERVICE";

      const key =
        `${type}-${row.product?.id || row.service?.id || name}`;

      const current =
        topSellingMap.get(key) || {
          id:
            row.product?.id ||
            row.service?.id ||
            null,

          code:
            row.product?.code ||
            row.service?.code ||
            null,

          name,
          type,
          quantity: 0,
          revenue: 0,
        };

      current.quantity +=
        toNumber(row.quantity);

      current.revenue +=
        toNumber(row.total);

      topSellingMap.set(
        key,
        current
      );
    }

    /* ========================================================
   TOP SELLING PRODUCTS - PRODUCTS ONLY
======================================================== */

    const topSellingProducts = Array.from(
      topSellingMap.values()
    )
      .filter((item) => item.type === "PRODUCT")
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    /* ========================================================
       TOP SELLING SERVICES - SERVICES ONLY
    ======================================================== */

    const topSellingServices = Array.from(
      topSellingMap.values()
    )
      .filter((item) => item.type === "SERVICE")
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const paymentStatusSummary =
      paymentStatusRows.map(
        (row) => ({
          status:
            row.paymentStatus,

          count:
            row._count._all,

          total:
            toNumber(
              row._sum.total
            ),

          paidAmount:
            toNumber(
              row._sum.paidAmount
            ),

          balanceAmount:
            toNumber(
              row._sum.balanceAmount
            ),
        })
      );

    /* ========================================================
       RESPONSE
    ======================================================== */

    return NextResponse.json({
      success: true,

      data: {
        /* ----------------------------------------------------
           PERIOD
        ---------------------------------------------------- */

        period: {
          selected: period,

          start:
            periodStart.toISOString(),

          end:
            periodEnd.toISOString(),
        },

        /* ----------------------------------------------------
           SUMMARY
        ---------------------------------------------------- */

        summary: {
          /* Today */

          todaySales,
          todayPaid,
          todayOrders,

          yesterdaySales,
          yesterdayOrders,

          salesChange,
          ordersChange,

          /* Selected period */

          periodSales,
          periodPaid,
          periodOrders,

          previousPeriodSales,
          previousPeriodOrders,

          periodSalesChange,
          periodOrdersChange,

          /* Products */

          totalProducts,

          /* Stock */

          lowStockCount:
            lowStockProducts.length,

          outOfStockCount:
            outOfStockProducts.length,

          /* Payments */

          totalPayments,
        },

        /* ----------------------------------------------------
           SALES OVERVIEW
        ---------------------------------------------------- */

        salesOverview: salesByDay,

        /* ----------------------------------------------------
           CATEGORY SALES
        ---------------------------------------------------- */

        salesByCategory,

        /* ----------------------------------------------------
           PAYMENT METHODS
        ---------------------------------------------------- */

        paymentMethods,

        /* ----------------------------------------------------
           TOP SELLING PRODUCTS
        ---------------------------------------------------- */

        topSellingProducts,

        /* ----------------------------------------------------
           TOP SELLING SERVICES
        ---------------------------------------------------- */

        topSellingServices,

        /* ----------------------------------------------------
           RECENT SALES
        ---------------------------------------------------- */

        recentSales,

        /* ----------------------------------------------------
           LOW STOCK
        ---------------------------------------------------- */

        lowStockProducts:
          lowStockProducts.slice(
            0,
            10
          ),

        /* ----------------------------------------------------
           OUT OF STOCK
        ---------------------------------------------------- */

        outOfStockProducts:
          outOfStockProducts.slice(
            0,
            10
          ),

        /* ----------------------------------------------------
           PAYMENT STATUS
        ---------------------------------------------------- */

        paymentStatusSummary,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load dashboard data.",
      },
      {
        status: 500,
      }
    );
  }
}