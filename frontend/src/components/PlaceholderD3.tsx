'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function PlaceholderD3() {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (d3Container.current) {
      // Clear previous
      d3.select(d3Container.current).selectAll('*').remove();

      const width = d3Container.current.clientWidth;
      const height = 300;

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#0f172a') // slate-900
        .style('border-radius', '0.5rem')
        .style('border', '1px solid #1e293b'); // slate-800

      // Add dummy sine wave to simulate Grad-CAM signal
      const data = d3.range(0, Math.PI * 4, 0.1).map(x => ({ x, y: Math.sin(x) }));
      
      const xScale = d3.scaleLinear().domain([0, Math.PI * 4]).range([20, width - 20]);
      const yScale = d3.scaleLinear().domain([-1.5, 1.5]).range([height - 20, 20]);

      const line = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis);

      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444') // accent-red (reserved for Grad-CAM)
        .attr('stroke-width', 2)
        .attr('d', line);
        
      svg.append('text')
        .attr('x', 20)
        .attr('y', 30)
        .attr('fill', '#cbd5e1') // slate-300
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text('D3.js Placeholder (Heatmap Simulator)');
    }
  }, []);

  return (
    <div className="w-full" ref={d3Container} />
  );
}
