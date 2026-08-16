
/**
 * 人生K线 · 蜡烛图主组件
 * ECharts candlestick + markArea（按大运段着色）+ dataZoom 滚轮缩放
 */

import { useCallback, useMemo } from "react";
import type { ECharts, EChartsOption } from "echarts";
import EChart from "./EChart";
import type { KLineEngineResult } from "@/lib/kline/types";

export interface KlineChartProps {
  data: KLineEngineResult;
  colorMode: "cn" | "us";
  onSelectYear?: (age: number) => void;
  selectedAge?: number;
}

export default function KlineChart({
  data,
  colorMode,
  onSelectYear,
  selectedAge,
}: KlineChartProps) {
  const handleReady = useCallback(
    (chart: ECharts) => {
      chart.on("click", (params: unknown) => {
        const p = params as { dataIndex?: number };
        if (typeof p.dataIndex === "number") {
          onSelectYear?.(p.dataIndex + 1);
        }
      });
    },
    [onSelectYear],
  );

  const option: EChartsOption = useMemo(() => {
    const upColor = colorMode === "cn" ? "#c8402a" : "#3d7a5e";
    const downColor = colorMode === "cn" ? "#3d7a5e" : "#c8402a";
    const upBorder = colorMode === "cn" ? "#e05a3a" : "#5a9b7d";
    const downBorder = colorMode === "cn" ? "#5a9b7d" : "#e05a3a";

    const dates = data.points.map((p) => `${p.age}岁·${p.year}`);
    const candle = data.points.map((p) => [p.open, p.close, p.low, p.high]);

    const lastPointAge = data.points[data.points.length - 1]?.age ?? 0;

    const markAreaData = data.daYun
      .filter((seg) => seg.startAge <= lastPointAge)
      .map((seg, idx) => {
        const startYear = data.points.find((p) => p.age === seg.startAge)?.year ?? 0;
        const lastInSeg = [...data.points].reverse().find((p) => p.age <= seg.endAge);
        const endYear = lastInSeg?.year ?? (data.points[data.points.length - 1]?.year ?? 0);
        return [
          {
            name: seg.ganZhi,
            xAxis: startYear,
            itemStyle: {
              color: idx % 2 === 0 ? "rgba(201,164,92,0.05)" : "rgba(192,57,43,0.04)",
              borderColor: "rgba(201,164,92,0.18)",
              borderWidth: 1,
            },
            label: {
              show: true,
              position: "insideTop" as const,
              color: "#d9b876",
              fontFamily: "var(--font-song)",
              fontSize: 11,
              formatter: seg.ganZhi,
            },
          },
          { xAxis: endYear },
        ] as Array<Record<string, unknown>>;
      });

    const markPointData = data.points.map((p) => ({
      name: p.ganZhi,
      coord: [p.year, p.high] as [number, number],
      value: p.ganZhi,
      itemStyle: {
        color: p.close >= p.open ? upColor : downColor,
        opacity: selectedAge && p.age === selectedAge ? 1 : 0.0,
      },
      label: {
        show: selectedAge === p.age,
        position: "top" as const,
        color: "#e8cf9a",
        fontFamily: "var(--font-song)",
        fontSize: 11,
        formatter: `${p.ganZhi} ${p.tenGod}`,
      },
    }));

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 900,
      animationEasing: "cubicOut",
      animationDelay: (idx: number) => Math.min(idx * 8, 600),
      grid: { left: 40, right: 24, top: 36, bottom: 60 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", lineStyle: { color: "#c9a45c", opacity: 0.4 } },
        backgroundColor: "rgba(18,16,12,0.96)",
        borderColor: "rgba(201,164,92,0.4)",
        textStyle: { color: "#f3ecdb", fontFamily: "var(--font-song)" },
        formatter: (params: unknown) => {
          const arr = params as Array<{
            dataIndex: number;
            data: number[];
            axisValue: string;
          }>;
          const first = arr[0];
          if (!first) return "";
          const p = data.points[first.dataIndex];
          if (!p) return "";
          const dir = p.close >= p.open ? "▲" : "▼";
          return `
            <div style="font-weight:700;color:#e8cf9a">${p.year} · ${p.ganZhi}（${p.age}岁）</div>
            <div style="color:#b8a67a">大运：${p.daYun}（${p.daYunStartAge}岁起）</div>
            <div style="color:#d5c69e">十神：${p.tenGod}（地支主气：${p.tenGodZhi}）</div>
            <div style="color:#d5c69e">五行：${p.wuxing}</div>
            <div style="margin-top:4px;color:#f3ecdb">
              开 ${p.open} · 收 ${p.close} ${dir}<br/>
              高 ${p.high} · 低 ${p.low}<br/>
              均分 ${p.score}
            </div>
            <div style="margin-top:4px;color:#b8a67a;font-size:11px">${p.reason}</div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "rgba(201,164,92,0.3)" } },
        axisLabel: {
          color: "#b8a67a",
          fontFamily: "var(--font-song)",
          fontSize: 10,
          interval: Math.floor(dates.length / 12),
          formatter: (val: string) => val.split("·")[0],
        },
        splitLine: { show: false },
      },
      yAxis: {
        scale: true,
        axisLine: { lineStyle: { color: "rgba(201,164,92,0.3)" } },
        axisLabel: { color: "#b8a67a", fontFamily: "var(--font-song)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(201,164,92,0.08)" } },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
        {
          type: "slider",
          height: 22,
          bottom: 16,
          start: 0,
          end: 100,
          backgroundColor: "rgba(31,27,20,0.6)",
          borderColor: "rgba(201,164,92,0.2)",
          fillerColor: "rgba(201,164,92,0.18)",
          handleStyle: { color: "#c9a45c" },
          textStyle: { color: "#b8a67a", fontSize: 10 },
        },
      ],
      series: [
        {
          type: "candlestick",
          data: candle,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorder,
            borderColor0: downBorder,
          },
          markArea: {
            silent: true,
            data: markAreaData as never,
            itemStyle: { opacity: 0.45 },
          },
          markPoint: {
            data: markPointData as never,
            symbol: "circle",
            symbolSize: 6,
          },
        },
      ],
    };
  }, [data, colorMode, selectedAge]);

  return (
    <EChart
      option={option}
      onChartReady={handleReady}
      className="w-full"
      height={400}
    />
  );
}
