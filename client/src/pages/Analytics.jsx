import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Spinner, Banner } from '../ui.jsx';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* Chart palette — gold leads, supporting hues stay calm */
const COLORS = ['#f5a623', '#3b82f6', '#16a34a', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const AXIS = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: '#94a3b8' };
const GRID = '#ececea';

function Panel({ title, hint, children }) {
  return (
    <Card className="p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-[13.5px] tracking-[-0.005em]">{title}</h3>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div style={{ width: '100%', height: 260 }}>{children}</div>
    </Card>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/analytics').then(setData); }, []);
  if (!data) return <Spinner />;

  const hasData = data.qoq.some((q) => q.sheets > 0);

  return (
    <div>
      <PageHeader title="Analytics"
        subtitle="Quarter-on-quarter trends, goal distribution, and manager effectiveness" />

      {!hasData && (
        <div className="mb-4">
          <Banner tone="info">Limited data — trends populate as quarterly achievements are logged.</Banner>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        <Panel title="Quarter-on-Quarter Progress" hint="Weighted progress across all sheets">
          <ResponsiveContainer>
            <LineChart data={data.qoq} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="quarter" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={AXIS} unit="%" axisLine={{ stroke: GRID }} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Line type="monotone" dataKey="avgProgress" name="Avg weighted progress"
                stroke="#f5a623" strokeWidth={2.5} dot={{ r: 3.5, fill: '#f5a623' }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Progress by Department">
          <ResponsiveContainer>
            <BarChart data={data.byDept} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="department" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={AXIS} unit="%" axisLine={{ stroke: GRID }} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
              {QUARTERS.map((q, i) => (
                <Bar key={q} dataKey={q} fill={COLORS[i]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Goal Distribution by Thrust Area">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.distribution.byThrustArea} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={88} innerRadius={46} paddingAngle={2}
                stroke="#fff" strokeWidth={2} label>
                {data.distribution.byThrustArea.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Goal Status Breakdown">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.distribution.byStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={88} innerRadius={46} paddingAngle={2}
                stroke="#fff" strokeWidth={2} label>
                {data.distribution.byStatus.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.name === 'Completed' ? '#16a34a'
                      : entry.name === 'On Track' ? '#f5a623' : '#cbd5e1'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Goal Distribution by UoM Type">
          <ResponsiveContainer>
            <BarChart data={data.distribution.byUom} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Bar dataKey="value" name="Goals" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Manager Check-in Effectiveness">
          <ResponsiveContainer>
            <BarChart data={data.managerEffectiveness} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="manager" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={AXIS} unit="%" axisLine={{ stroke: GRID }} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }} />
              <Bar dataKey="checkinRate" name="Check-in completion %"
                fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
