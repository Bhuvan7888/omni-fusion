'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function HistoryTimeline() {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (d3Container.current) {
      d3.select(d3Container.current).selectAll('*').remove();

      const width = d3Container.current.clientWidth;
      const height = 200;
      const margin = { top: 20, right: 20, bottom: 30, left: 40 };

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#0f172a') // slate-900
        .style('border-radius', '0.5rem')
        .style('border', '1px solid #1e293b'); // slate-800

      // Mock historical data: Potassium levels over 5 years
      const data = [
        { year: 2019, val: 3.5 },
        { year: 2020, val: 3.8 },
        { year: 2021, val: 4.2 },
        { year: 2022, val: 4.0 },
        { year: 2023, val: 5.1 }, // Spike
        { year: 2024, val: 4.8 },
      ];

      const xScale = d3.scaleLinear()
        .domain([2019, 2024])
        .range([margin.left, width - margin.right]);
      
      const yScale = d3.scaleLinear()
        .domain([3.0, 6.0])
        .range([height - margin.bottom, margin.top]);

      const line = d3.line<{year: number, val: number}>()
        .x(d => xScale(d.year))
        .y(d => yScale(d.val))
        .curve(d3.curveMonotoneX);

      // Axes
      const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d'));
      const yAxis = d3.axisLeft(yScale).ticks(4);

      svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .attr('color', '#64748b'); // slate-500

      svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)
        .attr('color', '#64748b');

      // Line
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#94a3b8') // slate-400
        .attr('stroke-width', 2)
        .attr('d', line);

      // Dots
      svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.val))
        .attr('r', 4)
        .attr('fill', '#f8fafc'); // slate-50
        
      // Title
      svg.append('text')
        .attr('x', margin.left + 10)
        .attr('y', margin.top + 10)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '12px')
        .text('Potassium (mmol/L) - Past 5 Years');
    }
  }, []);

  return <div className="w-full" ref={d3Container} />;
}
