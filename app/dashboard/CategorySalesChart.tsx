"use client";

import ReactECharts from "echarts-for-react";

type CategoryItem = {
  name: string;
  value: number;
};

type Props = {
  data: CategoryItem[];
};

export default function CategorySalesChart({
  data,
}: Props) {
  const option = {
    tooltip: {
      trigger: "item",

      formatter: (params: any) => `
        <div style="min-width:150px">
          <strong>${params.name}</strong>

          <div style="margin-top:6px">
            Sales:
            <strong>
              Rs. ${Number(
                params.value
              ).toLocaleString()}
            </strong>
          </div>

          <div>
            Share:
            <strong>
              ${params.percent}%
            </strong>
          </div>
        </div>
      `,
    },

    legend: {
      orient: "vertical",
      right: 0,
      top: "center",

      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,

      textStyle: {
        color: "#94a3b8",
        fontSize: 11,
      },
    },

    series: [
      {
        name: "Sales",
        type: "pie",

        radius: ["55%", "78%"],

        center: ["35%", "50%"],

        itemStyle: {
          borderRadius: 6,
          borderColor: "#0b1712",
          borderWidth: 2,
        },

        label: {
          show: false,
        },

        emphasis: {
          scale: true,
          scaleSize: 6,

          label: {
            show: true,
            fontSize: 13,
            fontWeight: "bold",
            formatter: "{b}\n{d}%",
          },
        },

        labelLine: {
          show: false,
        },

        data,
      },
    ],
  };

  return (
    <div className="h-[280px] w-full">
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