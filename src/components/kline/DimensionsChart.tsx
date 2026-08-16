
/**
 * 人生K线 · 六维走势图
 * 同一 x 轴六条折线（事业/财富/婚姻/健康/六亲）
 */

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import type { KLineEngineResult } from "@/lib/kline/types";

const DIM_COLORS = {
  career: "#c8402a",    // 朱砂 - 事业
  wealth: "#d9b876",    // 金 - 财富
  marriage: "#e07b9b",  // 桃 - 婚姻
  health: "#5a9b7d",    // 翠 - 健康
  family: "#3a6ea5",    // 水 - 六亲
};

const DIM_LABEL: Record<keyof typeof DIM_COLORS, string> = {
  career: "事业",
  wealth: "财富",
  marriage: "姻缘",
  health: "健康",
  family: "六亲",
};

export interface DimensionsChartProps {
  data: KLineEngineResult;
}

export default function DimensionsChart({ data }: DimensionsChartProps) {
  const option: EChartsOption = useMemo(() => {
    const dates = data.points.map((p) => `${p.age}岁·${p.year}`);
    const series = (Object.keys(DIM_COLORS) as Array<keyof typeof DIM_COLORS>).map(
      (key) => ({
        name: DIM_LABEL[key],
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: DIM_COLORS[key], width: 1.4 },
        itemStyle: { color: DIM_COLORS[key] },
        emphasis: { focus: "series" as const, lineStyle: { width: 2.4 } },
        data: data.points.map((p) => p.dimensionScores[key]),
      }),
    );
    return {
      backgroundColor: "transparent",
      animation: false,
      grid: { left: 40, right: 24, top: 36, bottom: 56 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(18,16,12,0.96)",
        borderColor: "rgba(201,164,92,0.4)",
        textStyle: { color: "#f3ecdb", fontFamily: "var(--font-song)" },
        axisPointer: { type: "cross", lineStyle: { color: "rgba(201,164,92,0.3)" } },
      },
      legend: {
        top: 4,
        textStyle: { color: "#b8a67a", fontFamily: "var(--font-song)", fontSize: 11 },
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "rgba(201,164,92,0.3)" } },
        axisLabel: {
          color: "#b8a67a",
          fontFamily: "var(--font-song)",
          fontSize: 10,
          interval: Math.floor(dates.length / 12),
          formatter: (val: string) => val.split("·")[0],
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: "rgba(201,164,92,0.3)" } },
        axisLabel: { color: "#b8a67a", fontFamily: "var(--font-song)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(201,164,92,0.08)" } },
      },
      dataZoom: [
        {
          type: "inside",
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: "slider",
          height: 18,
          bottom: 8,
          backgroundColor: "rgba(31,27,20,0.6)",
          borderColor: "rgba(201,164,92,0.2)",
          fillerColor: "rgba(201,164,92,0.16)",
          handleStyle: { color: "#c9a45c" },
          textStyle: { color: "#b8a67a", fontSize: 10 },
        },
      ],
      series,
    };
  }, [data]);

  return <EChart option={option} height={280} />;
}
