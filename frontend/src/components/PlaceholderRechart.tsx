'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Jan', val: 4000 },
  { name: 'Feb', val: 3000 },
  { name: 'Mar', val: 2000 },
  { name: 'Apr', val: 2780 },
  { name: 'May', val: 1890 },
  { name: 'Jun', val: 2390 },
  { name: 'Jul', val: 3490 },
];

export default function PlaceholderRechart() {
  return (
    <div className="w-full h-[300px] bg-slate-900 rounded-lg p-4 border border-slate-800">
      <h3 className="text-slate-300 font-semibold mb-4">Recharts Placeholder</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Area type="monotone" dataKey="val" stroke="#94a3b8" fill="#475569" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
