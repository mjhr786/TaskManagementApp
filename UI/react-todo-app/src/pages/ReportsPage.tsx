
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/api'
import { Alert, Card, CardContent, MenuItem, Select, Stack, Typography, Button } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

export type TaskVm = { id: string, title: string, description?: string, date: string, status: string, totalHours: number }

function toIso(d: Date) { return d.toISOString().slice(0,10) }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(d.getDate() + days); return x }

function getDefaultRange() {
  const today = new Date()
  const start = addDays(today, -6)
  return { start: toIso(start), end: toIso(today) }
}

export default function ReportsPage() {
  const def = getDefaultRange()
  const [tasks, setTasks] = useState<TaskVm[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')            // filter by status in chart
  const [startDate, setStartDate] = useState<string>(def.start)
  const [endDate, setEndDate] = useState<string>(def.end)

  const load = async () => {
    try {
      const data = await api.getTasks({
        page: 1,
        pageSize: 500,            // pull enough rows for the range; adjust as needed
        sort: 'date',
        order: 'asc',
        fromDate: startDate || undefined,
        toDate: endDate || undefined
      })
      setTasks(data.items)        // API returns paged shape
    } catch (e:any) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [startDate, endDate])

  const days = useMemo(() => {
    const arr: string[] = []
    if (!startDate || !endDate) return arr
    const start = new Date(startDate)
    const end = new Date(endDate)
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) arr.push(toIso(d))
    return arr
  }, [startDate, endDate])

  const barData = useMemo(() => {
    const map: Record<string, number> = {}
    days.forEach(d => map[d] = 0)
    tasks.filter(t => (!status || t.status === status)).forEach(t => {
      if (map[t.date] !== undefined) map[t.date] += (t.totalHours || 0)
    })
    return days.map(d => ({ date: d, hours: map[d] }))
  }, [tasks, days, status])

  const clearFilters = () => {
    const r = getDefaultRange()
    setStatus('')
    setStartDate(r.start)
    setEndDate(r.end)
    setError(null)
  }

  return (
    <Card className="card">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h6">Weekly Time Summary</Typography>

          {/* Date range filters */}
          <label>Start</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>End</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />

          {/* Status filter */}
          <Select size="small" value={status} displayEmpty onChange={e => setStatus(e.target.value)}>
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="InProgress">InProgress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Archived">Archived</MenuItem>
          </Select>

          <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
        </Stack>

        {error && <Alert sx={{ mt:2 }} severity="error">{error}</Alert>}

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" name="Hours" fill="#1976d2" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
