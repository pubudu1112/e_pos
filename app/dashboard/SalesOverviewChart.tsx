"use client";

import ReactECharts from "echarts-for-react";

type SalesOverviewItem = {
  date: string;
  sales: number;
};

type SalesOverviewPeriod =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "year";

type Props = {
  data: SalesOverviewItem[];
  period?: SalesOverviewPeriod;
};

function formatCurrency(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-LK");
}

export default function SalesOverviewChart({
  data,
  period = "7days",
}: Props) {
  /* ============================================================
     PREPARE CHART DATA
  ============================================================ */

  let chartData = data;

  /* ============================================================
     YEAR VIEW
     
     API gives daily data for the year.
     We combine it into monthly totals.
  ============================================================ */

  if (period === "year") {
    const monthlySales = new Map<
      string,
      number
    >();

    data.forEach((item) => {
      const date = new Date(item.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const current =
        monthlySales.get(monthKey) || 0;

      monthlySales.set(
        monthKey,
        current + Number(item.sales || 0)
      );
    });

    chartData = Array.from(
      monthlySales.entries()
    ).map(([month, sales]) => ({
      date: `${month}-01`,
      sales,
    }));
  }

  /* ============================================================
     LABELS
  ============================================================ */

  const labels = chartData.map((item) => {
    const date = new Date(item.date);

    if (Number.isNaN(date.getTime())) {
      return item.date;
    }

    if (period === "year") {
      return date.toLocaleDateString("en-LK", {
        month: "short",
      });
    }

    if (period === "today") {
      return date.toLocaleDateString("en-LK", {
        day: "2-digit",
        month: "short",
      });
    }

    return date.toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "short",
    });
  });

  /* ============================================================
     SALES
  ============================================================ */

  const sales = chartData.map((item) =>
    Number(item.sales || 0)
  );

  /* ============================================================
     PERIOD LABEL
  ============================================================ */

  const periodLabel =
    period === "today"
      ? "Today"
      : period === "7days"
      ? "Last 7 Days"
      : period === "30days"
      ? "Last 30 Days"
      : period === "month"
      ? "This Month"
      : "This Year";

  /* ============================================================
     ECHART OPTIONS
  ============================================================ */

  const option = {
    animation: true,

    tooltip: {
      trigger: "axis",

      backgroundColor: "#ffffff",

      borderColor: "#e2e8f0",

      borderWidth: 1,

      padding: 10,

      textStyle: {
        color: "#0f172a",
        fontSize: 12,
      },

      formatter: (params: any[]) => {
        if (!params || params.length === 0) {
          return "";
        }

        const item = params[0];

        return `
          <div style="min-width:160px">
            <div style="
              font-size:12px;
              font-weight:600;
              color:#475569;
              margin-bottom:6px;
            ">
              ${item.axisValue}
            </div>

            <div style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:16px;
            ">
              <span style="color:#64748b;">
                Sales
              </span>

              <strong style="color:#0f172a;">
                ${formatCurrency(
                  Number(item.value || 0)
                )}
              </strong>
            </div>
          </div>
        `;
      },
    },

    grid: {
      left: 15,
      right: 20,
      top: 30,
      bottom: 25,
      containLabel: true,
    },

    xAxis: {
      type: "category",

      boundaryGap: false,

      data: labels,

      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#94a3b8",

        fontSize: 11,

        interval:
          period === "year"
            ? 0
            : period === "30days"
            ? 2
            : 0,
      },
    },

    yAxis: {
      type: "value",

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#94a3b8",

        fontSize: 10,

        formatter: (value: number) =>
          `Rs. ${formatNumber(value)}`,
      },

      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.12)",
        },
      },
    },

    series: [
      {
        name: "Sales",

        type: "line",

        smooth: true,

        symbol: "circle",

        symbolSize:
          period === "year"
            ? 8
            : 7,

        lineStyle: {
          width: 3,
          color: "#10b981",
        },

        itemStyle: {
          color: "#10b981",
        },

        emphasis: {
          focus: "series",

          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        },

        areaStyle: {
          color: "rgba(16,185,129,0.12)",
        },

        data: sales,
      },
    ],
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="relative h-[280px] w-full">

      {/* CHART */}

      <ReactECharts
        option={option}
        style={{
          height: "100%",
          width: "100%",
        }}
        opts={{
          renderer: "canvas",
        }}
      />

      {/* PERIOD INFORMATION */}

      <div
        className="
          pointer-events-none
          absolute
          right-2
          top-0
          hidden
          text-[10px]
          text-muted-foreground
          sm:block
        "
      >
        {periodLabel}
      </div>
    </div>
  );
}