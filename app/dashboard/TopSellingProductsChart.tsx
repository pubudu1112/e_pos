
"use client";

import ReactECharts from "echarts-for-react";

type ProductItem = {
  name: string;
  quantity: number;
  revenue: number;
};

type Props = {
  data: ProductItem[];
  barColor?: string;
};

function formatCurrency(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TopSellingProductsChart({
  data,
  barColor = "#10b981",
}: Props) {
  const sortedData = [...data]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .reverse();

  if (sortedData.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No sales data available
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sales will appear here once recorded.
          </p>
        </div>
      </div>
    );
  }

  const names = sortedData.map((item) => item.name);

  const quantities = sortedData.map(
    (item) => item.quantity
  );

  const option = {
    animation: true,

    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      padding: 12,

      textStyle: {
        color: "#0f172a",
        fontSize: 12,
      },

      axisPointer: {
        type: "shadow",
      },

      formatter: (params: any[]) => {
        const item = params[0];
        const product = sortedData[item.dataIndex];

        return `
          <div style="min-width:180px">
            <div style="
              font-weight:700;
              margin-bottom:8px;
              color:#0f172a;
            ">
              ${product.name}
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              gap:20px;
              margin-bottom:5px;
            ">
              <span style="color:#64748b">
                Quantity Sold
              </span>
              <strong>${product.quantity}</strong>
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              gap:20px;
            ">
              <span style="color:#64748b">
                Revenue
              </span>
              <strong>
                ${formatCurrency(product.revenue)}
              </strong>
            </div>
          </div>
        `;
      },
    },

    grid: {
      left: 15,
      right: 35,
      top: 15,
      bottom: 25,
      containLabel: true,
    },

    xAxis: {
      type: "value",
      min: 0,

      axisLabel: {
        color: "#94a3b8",
        fontSize: 10,
      },

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },

      splitLine: {
        lineStyle: {
          color: "rgba(148,163,184,0.12)",
        },
      },
    },

    yAxis: {
      type: "category",
      data: names,

      axisLabel: {
        color: "#94a3b8",
        fontSize: 11,
        width: 150,
        overflow: "truncate",
      },

      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },

      axisTick: {
        show: false,
      },
    },

    series: [
      {
        name: "Quantity Sold",
        type: "bar",
        data: quantities,

        barWidth: 20,

        itemStyle: {
          color: barColor,
          borderRadius: [0, 7, 7, 0],
        },

        emphasis: {
          focus: "series",
          itemStyle: {
            opacity: 0.85,
          },
        },

        label: {
          show: true,
          position: "right",
          color: "#94a3b8",
          fontSize: 10,
          formatter: (params: any) =>
            Number(params.value).toLocaleString("en-LK"),
        },
      },
    ],
  };

  return (
    <div className="h-[320px] w-full">
      <ReactECharts
        option={option}
        style={{
          height: "100%",
          width: "100%",
        }}
        opts={{
          renderer: "canvas",
        }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
