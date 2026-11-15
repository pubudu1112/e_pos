import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const paymentStatus =
      searchParams.get("paymentStatus")?.trim() || "";

    const status =
      searchParams.get("status")?.trim() || "";

    const dateFrom =
      searchParams.get("dateFrom")?.trim() || "";

    const dateTo =
      searchParams.get("dateTo")?.trim() || "";

    const where: any = {};

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    if (search) {
      where.OR = [
        {
          invoiceNo: {
            contains: search,
          },
        },
        {
          customer: {
            name: {
              contains: search,
            },
          },
        },
        {
          customer: {
            phone: {
              contains: search,
            },
          },
        },
      ];
    }

    // -------------------------------------------------------
    // PAYMENT STATUS
    // -------------------------------------------------------

    if (paymentStatus) {
      where.paymentStatus =
        paymentStatus;
    }

    // -------------------------------------------------------
    // SALE STATUS
    // -------------------------------------------------------

    if (status) {
      where.status = status;
    }

    // -------------------------------------------------------
    // DATE FROM
    // -------------------------------------------------------

    if (dateFrom) {
      const from = new Date(
        `${dateFrom}T00:00:00`
      );

      if (!Number.isNaN(from.getTime())) {
        where.saleDate = {
          ...(where.saleDate || {}),
          gte: from,
        };
      }
    }

    // -------------------------------------------------------
    // DATE TO
    // -------------------------------------------------------

    if (dateTo) {
      const to = new Date(
        `${dateTo}T23:59:59.999`
      );

      if (!Number.isNaN(to.getTime())) {
        where.saleDate = {
          ...(where.saleDate || {}),
          lte: to,
        };
      }
    }

    // -------------------------------------------------------
    // SALES
    // -------------------------------------------------------

    const sales =
      await prisma.sale.findMany({
        where,

        orderBy: {
          saleDate: "desc",
        },

        take: 100,

        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
            },
          },

          payment: {
            orderBy: {
              id: "desc",
            },

            take: 1,

            include: {
              paymentmethod: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },

          saleitem: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              costPrice: true,
              discount: true,
              tax: true,
              total: true,
              productId: true,
              serviceId: true,
            },
          },
        },
      });

          // -------------------------------------------------------
    // SUMMARY - ALL MATCHING SALES (NOT LIMITED TO 100)
    // -------------------------------------------------------

    const [summaryAggregate, orderCount] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: {
          total: true,
          paidAmount: true,
          balanceAmount: true,
          discount: true,
        },
      }),

      prisma.sale.count({ where }),
    ]);

    const summary = {
      totalSales: toNumber(summaryAggregate._sum.total),
      totalPaid: toNumber(summaryAggregate._sum.paidAmount),
      totalBalance: toNumber(summaryAggregate._sum.balanceAmount),
      totalDiscount: toNumber(summaryAggregate._sum.discount),
      orderCount,
    };
    // -------------------------------------------------------
    // FORMAT
    // -------------------------------------------------------

    const data = sales.map((sale) => ({
      id: sale.id,

      invoiceNo: sale.invoiceNo,

      saleDate:
        sale.saleDate.toISOString(),

      customer: sale.customer
        ? {
            id: sale.customer.id,
            code: sale.customer.code,
            name: sale.customer.name,
            phone: sale.customer.phone,
          }
        : null,

      subtotal: toNumber(
        sale.subtotal
      ),

      discount: toNumber(
        sale.discount
      ),

      tax: toNumber(
        sale.tax
      ),

      total: toNumber(
        sale.total
      ),

      paidAmount: toNumber(
        sale.paidAmount
      ),

      balanceAmount: toNumber(
        sale.balanceAmount
      ),

      status: sale.status,

      paymentStatus:
        sale.paymentStatus,

      paymentMethod:
        sale.payment[0]?.paymentmethod
          ? {
              id:
                sale.payment[0]
                  .paymentmethod.id,

              name:
                sale.payment[0]
                  .paymentmethod.name,

              type:
                sale.payment[0]
                  .paymentmethod.type,
            }
          : null,

      itemCount:
        sale.saleitem.length,

      items: sale.saleitem.map(
        (item) => ({
          id: item.id,

          description:
            item.description,

          quantity: toNumber(
            item.quantity
          ),

          unitPrice: toNumber(
            item.unitPrice
          ),

          costPrice:
            item.costPrice === null
              ? null
              : toNumber(
                  item.costPrice
                ),

          discount: toNumber(
            item.discount
          ),

          tax: toNumber(
            item.tax
          ),

          total: toNumber(
            item.total
          ),

          productId:
            item.productId,

          serviceId:
            item.serviceId,
        })
      ),
    }));

    return NextResponse.json({
      success: true,

      data,

      summary: {
        totalSales:
          Number(
            summary.totalSales.toFixed(
              2
            )
          ),

        totalPaid:
          Number(
            summary.totalPaid.toFixed(
              2
            )
          ),

        totalBalance:
          Number(
            summary.totalBalance.toFixed(
              2
            )
          ),

        totalDiscount:
          Number(
            summary.totalDiscount.toFixed(
              2
            )
          ),

        orderCount:
          summary.orderCount,
      },
    });
  } catch (error) {
    console.error(
      "GET SALES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load sales.",
      },
      {
        status: 500,
      }
    );
  }
}