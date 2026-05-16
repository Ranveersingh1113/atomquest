import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Spinner, Banner } from '../ui.jsx';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const COLORS = ['#f5a623', '#0ea5e9', '#16a34a', '#fb923c', '#ef4444', '#8b5cf6', '#14b8a6'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function Panel({ title, children }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>
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

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Quarter-on-Quarter Progress Trend">
          <ResponsiveContainer>
            <LineChart data={data.qoq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="avgProgress" name="Avg weighted progress"
                stroke="#f5a623" strokeWidth={3} dot={{ r: 4, fill: '#f5a623' }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Progress by Department">
          <ResponsiveContainer>
            <BarChart data={data.byDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
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
                cx="50%" cy="50%" outerRadius={90} label>
                {data.distribution.byThrustArea.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Goal Status Breakdown">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.distribution.byStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label>
                {data.distribution.byStatus.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.name === 'Completed' ? '#16a34a'
                      : entry.name === 'On Track' ? '#f5a623' : '#cbd5e1'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Goal Distribution by UoM Type">
          <ResponsiveContainer>
            <BarChart data={data.distribution.byUom} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" name="Goals" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Manager Check-in Effectiveness">
          <ResponsiveContainer>
            <BarChart data={data.managerEffectiveness}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="manager" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="checkinRate" name="Check-in completion %"
                fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
