"use client";

import ReactECharts from "echarts-for-react";

type ProductItem = {
  name: string;
  quantity: number;
  revenue: number;
};

type Props = {
  data: ProductItem[];
};

export default function TopSellingProductsChart({
  data,
}: Props) {
  const sortedData = [...data].sort(
    (a, b) => b.quantity - a.quantity
  );

  const names = sortedData.map(
    (item) => item.name
  );

  const quantities = sortedData.map(
    (item) => item.quantity
  );

  const option = {
    tooltip: {
      trigger: "axis",

      axisPointer: {
        type: "shadow",
      },

      formatter: (params: any[]) => {
        const item = params[0];

        const product =
          sortedData[item.dataIndex];

        return `
          <div style="min-width:180px">
            <strong>${product.name}</strong>

            <div style="margin-top:6px">
              Quantity:
              <strong>
                ${product.quantity}
              </strong>
            </div>

            <div>
              Revenue:
              <strong>
                Rs. ${Number(
                  product.revenue
                ).toLocaleString()}
              </strong>
            </div>
          </div>
        `;
      },
    },

    grid: {
      left: 20,
      right: 30,
      top: 20,
      bottom: 20,
      containLabel: true,
    },

    xAxis: {
      type: "value",

      axisLabel: {
        color: "#94a3b8",
        fontSize: 10,
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
      },

      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },
    },

    series: [
      {
        name: "Quantity Sold",
        type: "bar",

        data: quantities,

        barWidth: 18,

        itemStyle: {
          color: "#10b981",
          borderRadius: [
            0,
            6,
            6,
            0,
          ],
        },

        label: {
          show: true,
          position: "right",
          color: "#94a3b8",
          fontSize: 10,
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
      />
    </div>
  );
}