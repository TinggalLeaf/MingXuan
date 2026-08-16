
/**
 * 自封装 ECharts 组件（兼容 React 19）。
 * 使用 useRef + useEffect 手动 init/update/dispose，避开 echarts-for-react 与 React 19 的 ref 兼容性。
 */

import { useEffect, useRef } from "react";
import type { EChartsOption, ECharts } from "echarts";

export interface EChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  /** chart 实例创建后回调（外部可用做 click 事件绑定） */
  onChartReady?: (chart: ECharts) => void;
  /** 自适应高度 */
  height?: number | string;
}

export default function EChart({
  option,
  style,
  className,
  onChartReady,
  height = 360,
}: EChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    let disposed = false;
    let chart: ECharts | null = null;
    (async () => {
      const echarts = await import("echarts");
      if (disposed || !ref.current) return;
      chart = echarts.init(ref.current);
      chart.setOption(option);
      chartRef.current = chart;
      onChartReady?.(chart);
    })();
    return () => {
      disposed = true;
      chart?.dispose();
      chartRef.current = null;
    };
    // 仅在挂载时初始化；option 变化由下面的 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: false, lazyUpdate: true });
  }, [option]);

  useEffect(() => {
    function onResize() {
      chartRef.current?.resize();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height, ...style }}
    />
  );
}
