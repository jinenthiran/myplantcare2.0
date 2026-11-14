import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface ActivityHeatmapProps {
  tasks?: any[];
  notes?: any[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ tasks = [], notes = [] }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const totalTasksCompleted = tasks.filter((t) => t.completed).length;

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const daysData: { date: string; count: number; dateObj: Date }[] = [];
    const today = new Date();

    const activityCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      const dStr = t.date || t.dueDate || new Date().toISOString().slice(0, 10);
      activityCounts[dStr] = (activityCounts[dStr] || 0) + 1;
    });
    notes.forEach((n) => {
      const dStr = n.createdAt
        ? new Date(n.createdAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      activityCounts[dStr] = (activityCounts[dStr] || 0) + 2;
    });

    for (let i = 111; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const count = activityCounts[dStr] || 0;
      daysData.push({ date: dStr, count, dateObj: d });
    }

    const isDark = document.documentElement.classList.contains('dark');
    const emptyColor = isDark ? '#193A2E' : '#E9F0E6';
    const strokeColor = isDark ? '#10251D' : '#FFFFFF';
    const labelFill = isDark ? '#B6CDB4' : '#4A665B';

    const width = 720;
    const height = 148;
    const cellSize = 13;
    const cellPadding = 4;
    const weeks = 16;
    const daysPerWeek = 7;

    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', 'translate(24, 14)');

    const colorScale = d3
      .scaleSequential()
      .domain([1, 5])
      .interpolator(d3.interpolateRgb(isDark ? '#174C38' : '#B6CDB4', '#00D69A'));

    const weekGroups: (typeof daysData)[] = [];
    for (let w = 0; w < weeks; w++) {
      weekGroups.push(daysData.slice(w * daysPerWeek, (w + 1) * daysPerWeek));
    }

    weekGroups.forEach((week, wIdx) => {
      week.forEach((day, dIdx) => {
        svg
          .append('rect')
          .attr('x', wIdx * (cellSize + cellPadding))
          .attr('y', dIdx * (cellSize + cellPadding))
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', 3)
          .attr('fill', day.count === 0 ? emptyColor : colorScale(Math.min(5, day.count)))
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.2)
          .style('cursor', 'pointer')
          .on('mouseenter', (event) => {
            const [x, y] = d3.pointer(event, svgRef.current);
            setTooltip({ date: day.date, count: day.count, x, y });
          })
          .on('mouseleave', () => {
            setTooltip(null);
          });
      });
    });

    svg
      .append('text')
      .attr('x', 0)
      .attr('y', height - 24)
      .attr('fill', labelFill)
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(
        `16-Week Care Activity (${daysData.reduce((acc, d) => acc + d.count, 0)} logged events)`
      );
  }, [tasks, notes]);

  return (
    <ObservatoryCard padding="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <Activity className="w-4 h-4" />
            <span>Care Activity Heatmap</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Daily Plant Care & Milestone Cadence
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#174C38] dark:text-[#C7F36B] bg-[#FAF7EE] dark:bg-[#10251D] px-3 py-1.5 rounded-xl border border-[#174C38]/14 dark:border-[#B6CDB4]/18">
          <Sparkles className="w-3.5 h-3.5 text-[#00D69A]" />
          <span>{totalTasksCompleted} Completed Tasks</span>
        </div>
      </div>

      <div className="relative overflow-x-auto py-1">
        <svg ref={svgRef} className="w-full max-w-full" />
        {tooltip && (
          <div
            className="absolute bg-[#10251D] text-[#FAF7EE] text-[11px] px-2.5 py-1.5 rounded-lg border border-[#00D69A]/50 shadow-lg pointer-events-none z-20 font-mono"
            style={{ left: Math.min(580, tooltip.x), top: Math.max(0, tooltip.y - 45) }}
          >
            <div className="text-[#00D69A] font-bold">{tooltip.date}</div>
            <div>{tooltip.count} care actions logged</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4A665B] dark:text-[#B6CDB4] pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00D69A]" />
          <span>Tracks care tasks, watering reminders, and field observations over 16 weeks</span>
        </span>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-[#E9F0E6] dark:bg-[#193A2E]" />
          <span className="w-3 h-3 rounded-sm bg-[#B6CDB4] dark:bg-[#174C38]" />
          <span className="w-3 h-3 rounded-sm bg-[#00D69A]" />
          <span>More</span>
        </div>
      </div>
    </ObservatoryCard>
  );
};
