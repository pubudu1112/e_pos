"use client";

import ReactECharts from "echarts-for-react";

type PaymentItem = {
  name: string;
  value: number;
};

type Props = {
  data: PaymentItem[];
};

export default function PaymentMethodsChart({
  data,
}: Props) {
  const option = {
    tooltip: {
      trigger: "item",

      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderWidth: 1,

      textStyle: {
        color: "#0f172a",
      },

      formatter: (params: any) => `
        <div style="min-width:150px">
          <strong>${params.name}</strong>

          <div style="margin-top:6px">
            Amount:
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
      itemGap: 14,

      textStyle: {
        color: "#94a3b8",
        fontSize: 11,
      },
    },

    series: [
      {
        name: "Payment Methods",
        type: "pie",

        radius: ["55%", "78%"],

        center: ["35%", "50%"],

        avoidLabelOverlap: true,

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