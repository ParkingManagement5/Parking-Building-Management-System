import { useState } from 'react';
import { LayoutDashboard, Building2, Layers, Grid3x3, DoorOpen, Car, DollarSign, Users, BarChart3, Bell, Plus, Edit2, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from './DashboardLayout';
const NAV = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'floors', label: 'Floors', icon: Layers },
    { id: 'zones', label: 'Zones', icon: Grid3x3 },
    { id: 'slots', label: 'Parking Slots', icon: Grid3x3 },
    { id: 'gates', label: 'Gates', icon: DoorOpen },
    { id: 'vehicle-types', label: 'Vehicle Types', icon: Car },
    { id: 'pricing', label: 'Pricing Policy', icon: DollarSign },
    { id: 'shifts', label: 'Staff Shifts', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 3 },
];
const REVENUE_DATA = [
    { month: 'Jan', revenue: 38200, target: 36000 },
    { month: 'Feb', revenue: 41000, target: 38000 },
    { month: 'Mar', revenue: 39500, target: 40000 },
    { month: 'Apr', revenue: 44200, target: 41000 },
    { month: 'May', revenue: 46800, target: 43000 },
    { month: 'Jun', revenue: 48320, target: 45000 },
];
const OCCUPANCY_DATA = [
    { day: 'Mon', rate: 68 }, { day: 'Tue', rate: 74 }, { day: 'Wed', rate: 82 },
    { day: 'Thu', rate: 79 }, { day: 'Fri', rate: 91 }, { day: 'Sat', rate: 88 },
    { day: 'Sun', rate: 56 },
];
const VEHICLE_PIE = [
    { name: 'Sedan', value: 42, color: '#4F46E5' },
    { name: 'SUV', value: 28, color: '#06B6D4' },
    { name: 'Compact', value: 18, color: '#22C55E' },
    { name: 'Truck', value: 8, color: '#F59E0B' },
    { name: 'Motorcycle', value: 4, color: '#EF4444' },
];
const PEAK_DATA = [
    { hour: '06', count: 12 }, { hour: '07', count: 28 }, { hour: '08', count: 64 },
    { hour: '09', count: 82 }, { hour: '10', count: 76 }, { hour: '11', count: 71 },
    { hour: '12', count: 68 }, { hour: '13', count: 72 }, { hour: '14', count: 80 },
    { hour: '15', count: 85 }, { hour: '16', count: 90 }, { hour: '17', count: 88 },
    { hour: '18', count: 74 }, { hour: '19', count: 52 }, { hour: '20', count: 30 },
];
const BUILDINGS_DATA = [
    { id: 'B001', name: 'Central Tower', address: '100 Main St', floors: 5, totalSlots: 240, available: 67, status: 'active' },
    { id: 'B002', name: 'North Plaza', address: '45 Park Ave', floors: 3, totalSlots: 120, available: 34, status: 'active' },
    { id: 'B003', name: 'East Wing', address: '200 East Blvd', floors: 4, totalSlots: 180, available: 48, status: 'maintenance' },
    { id: 'B004', name: 'West Gate', address: '15 West Rd', floors: 2, totalSlots: 80, available: 21, status: 'active' },
];
const PRICING_DATA = [
    { type: 'Sedan', first2h: '$1.50', additional: '$1.00/hr', daily: '$15.00', monthly: '$280.00' },
    { type: 'SUV', first2h: '$2.00', additional: '$1.50/hr', daily: '$20.00', monthly: '$350.00' },
    { type: 'Compact', first2h: '$1.00', additional: '$0.75/hr', daily: '$12.00', monthly: '$220.00' },
    { type: 'Truck', first2h: '$2.50', additional: '$2.00/hr', daily: '$25.00', monthly: '$420.00' },
    { type: 'Motorcycle', first2h: '$0.75', additional: '$0.50/hr', daily: '$8.00', monthly: '$150.00' },
];
function StatusBadge({ status }) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
        available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        occupied: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'}`}>{status}</span>;
}
function Overview() {
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Occupancy Rate', value: '73%', change: '+5%', trend: 'up', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
            { label: 'Revenue (Month)', value: '$48,320', change: '+$3,120', trend: 'up', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
            { label: 'Active Sessions', value: '38', change: '-2 from avg', trend: 'down', icon: Car, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
            { label: 'Total Slots', value: '620', change: '453 occupied', trend: 'up', icon: Grid3x3, color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
        ].map(s => {
            const Icon = s.icon;
            return (<div key={s.label} className="bg-card border border-border rounded-2xl p-4">
              <div className={`size-9 rounded-xl flex items-center justify-center ${s.color} mb-3`}><Icon size={16}/></div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${s.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {s.trend === 'up' ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                {s.change}
              </div>
            </div>);
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* Revenue chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Revenue vs Target</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, '']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
              <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#revGrad)" name="Revenue"/>
              <Area type="monotone" dataKey="target" stroke="#06B6D4" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Target"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle type pie */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Vehicle Type Mix</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={VEHICLE_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {VEHICLE_PIE.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {VEHICLE_PIE.map(v => (<div key={v.name} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full shrink-0" style={{ background: v.color }}/>
                <span className="text-xs text-muted-foreground">{v.name}</span>
                <span className="text-xs font-semibold text-foreground ml-auto">{v.value}%</span>
              </div>))}
          </div>
        </div>
      </div>

      {/* Occupancy weekly */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground text-sm mb-5">Weekly Occupancy Rate (%)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={OCCUPANCY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
            <Tooltip formatter={(v) => [`${v}%`, 'Occupancy']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
            <Bar dataKey="rate" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={48}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>);
}
function Buildings() {
    const [buildings, setBuildings] = useState(BUILDINGS_DATA);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', address: '', floors: '', totalSlots: '' });
    const add = (e) => {
        e.preventDefault();
        setBuildings([...buildings, {
                id: `B00${buildings.length + 1}`,
                name: form.name,
                address: form.address,
                floors: parseInt(form.floors) || 1,
                totalSlots: parseInt(form.totalSlots) || 0,
                available: parseInt(form.totalSlots) || 0,
                status: 'active',
            }]);
        setShowModal(false);
        setForm({ name: '', address: '', floors: '', totalSlots: '' });
    };
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Building Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{buildings.length} buildings configured</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={14}/> Add Building
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {buildings.map(b => (<div key={b.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 size={18} className="text-primary"/>
              </div>
              <StatusBadge status={b.status}/>
            </div>
            <h3 className="font-semibold text-foreground">{b.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">{b.address}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{b.floors}</p>
                <p className="text-[10px] text-muted-foreground">Floors</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{b.totalSlots}</p>
                <p className="text-[10px] text-muted-foreground">Total Slots</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center dark:bg-emerald-500/10">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{b.available}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-300">Available</p>
              </div>
            </div>
            {/* Occupancy bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Occupancy</span>
                <span>{Math.round((b.totalSlots - b.available) / b.totalSlots * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(b.totalSlots - b.available) / b.totalSlots * 100}%` }}/>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <Edit2 size={12}/> Edit
              </button>
              <button onClick={() => setBuildings(buildings.filter(x => x.id !== b.id))} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                <Trash2 size={12}/> Delete
              </button>
            </div>
          </div>))}
      </div>

      {showModal && (<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">Add New Building</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} className="text-muted-foreground"/></button>
            </div>
            <form onSubmit={add} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Building Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. South Wing" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Address *</label>
                <input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Street Name" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Floors</label>
                  <input type="number" value={form.floors} onChange={e => setForm({ ...form, floors: e.target.value })} placeholder="3" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Total Slots</label>
                  <input type="number" value={form.totalSlots} onChange={e => setForm({ ...form, totalSlots: e.target.value })} placeholder="120" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">Add Building</button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
function ParkingSlots() {
    const FLOORS = ['B1', 'G', '1F', '2F', '3F'];
    const [activeFloor, setActiveFloor] = useState('1F');
    const [filter, setFilter] = useState('all');
    const SLOTS = Array.from({ length: 60 }, (_, i) => {
        const row = String.fromCharCode(65 + Math.floor(i / 10));
        const col = String(i % 10 + 1).padStart(2, '0');
        const seed = (i * 17 + 3) % 10;
        const status = seed < 4 ? 'available' : seed < 7 ? 'occupied' : seed < 9 ? 'reserved' : 'available';
        return { id: `${row}${col}`, status };
    });
    const filtered = filter === 'all' ? SLOTS : SLOTS.filter(s => s.status === filter);
    const counts = {
        available: SLOTS.filter(s => s.status === 'available').length,
        occupied: SLOTS.filter(s => s.status === 'occupied').length,
        reserved: SLOTS.filter(s => s.status === 'reserved').length,
    };
    return (<div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
            { label: 'Available', count: counts.available, color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
            { label: 'Occupied', count: counts.occupied, color: 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
            { label: 'Reserved', count: counts.reserved, color: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
        ].map(s => (<div key={s.label} className={`${s.color} border rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`size-3 rounded-full ${s.dot}`}/>
            <div>
              <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
              <p className={`text-xs ${s.text} opacity-80`}>{s.label}</p>
            </div>
          </div>))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        {/* Floor tabs */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {FLOORS.map(f => (<button key={f} onClick={() => setActiveFloor(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFloor === f ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{f}</button>))}
          </div>
          <div className="ml-auto flex gap-1 bg-muted rounded-xl p-1">
            {['all', 'available', 'occupied', 'reserved'].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{f}</button>))}
          </div>
        </div>

        {/* Slot grid */}
        <div className="p-4 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground mb-3">Floor {activeFloor} — {BUILDINGS_DATA[0].name}</p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
            {filtered.map(slot => (<div key={slot.id} title={`Slot ${slot.id} — ${slot.status}`} className={`aspect-[1.6] rounded-md flex items-center justify-center text-[8px] font-mono font-bold cursor-pointer transition-all hover:scale-110 hover:z-10 ${slot.status === 'available' ? 'bg-emerald-400/80 text-white hover:bg-emerald-500' :
                slot.status === 'occupied' ? 'bg-rose-400/80 text-white cursor-default' :
                    'bg-amber-400/80 text-white'}`}>
                {slot.id}
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
function Pricing() {
    const [pricing, setPricing] = useState(PRICING_DATA);
    const [editing, setEditing] = useState(null);
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Pricing Policy</h2>
        <span className="text-xs text-muted-foreground">Effective as of Jun 1, 2026</span>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Vehicle Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">First 2 Hours</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Additional</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Daily Max</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Monthly Pass</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pricing.map(p => (<tr key={p.type} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 font-medium text-sm text-foreground">{p.type}</td>
                <td className="px-5 py-3.5 text-sm font-mono text-foreground">{p.first2h}</td>
                <td className="px-5 py-3.5 text-sm font-mono text-foreground">{p.additional}</td>
                <td className="px-5 py-3.5 text-sm font-mono text-foreground">{p.daily}</td>
                <td className="px-5 py-3.5 text-sm font-mono text-foreground">{p.monthly}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => setEditing(p.type)} className="text-xs text-primary hover:underline">Edit</button>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function Reports() {
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Total Revenue YTD', value: '$257,040', change: '+18.4%' },
            { label: 'Avg Daily Revenue', value: '$1,604', change: '+12.1%' },
            { label: 'Avg Occupancy', value: '74%', change: '+5.3%' },
            { label: 'Peak Usage Hour', value: '5:00 PM', change: 'Consistent' },
        ].map(s => (<div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><TrendingUp size={11}/> {s.change}</p>
          </div>))}
      </div>

      {/* Revenue trend */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground text-sm">Monthly Revenue Trend</h3>
          <select className="text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none focus:border-primary">
            <option>2026</option><option>2025</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={REVENUE_DATA}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
            <Tooltip formatter={(v) => [`$${v.toLocaleString()}`]} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
            <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="url(#revGrad2)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Peak hours */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Peak Hour Analysis</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PEAK_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}:00`}/>
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} maxBarSize={20} name="Vehicles"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle mix */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Vehicle Type Distribution</h3>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={VEHICLE_PIE} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {VEHICLE_PIE.map((e, i) => <Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {VEHICLE_PIE.map(v => (<div key={v.name} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full shrink-0" style={{ background: v.color }}/>
                  <span className="text-xs text-muted-foreground flex-1">{v.name}</span>
                  <span className="text-xs font-bold text-foreground">{v.value}%</span>
                </div>))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
export default function ManagerDashboard() {
    const [page, setPage] = useState('overview');
    const titles = {
        overview: { title: 'Manager Dashboard', subtitle: 'Operations & analytics overview' },
        buildings: { title: 'Building Management', subtitle: 'Manage your parking facilities' },
        floors: { title: 'Floor Management', subtitle: 'Configure floor structures' },
        zones: { title: 'Zone Management', subtitle: 'Organize parking zones' },
        slots: { title: 'Parking Slots', subtitle: 'Interactive slot management' },
        gates: { title: 'Gate Management', subtitle: 'Entry and exit gate config' },
        'vehicle-types': { title: 'Vehicle Types', subtitle: 'Configure vehicle categories' },
        pricing: { title: 'Pricing Policy', subtitle: 'Manage rates and packages' },
        shifts: { title: 'Staff Shifts', subtitle: 'Schedule and manage shifts' },
        reports: { title: 'Reports & Analytics', subtitle: 'Comprehensive data insights' },
        notifications: { title: 'Notifications', subtitle: 'System alerts' },
    };
    const p = titles[page] ?? { title: 'Manager', subtitle: '' };
    return (<DashboardLayout role="manager" navItems={NAV} currentPage={page} setCurrentPage={setPage} title={p.title} subtitle={p.subtitle} userName="Sam Rivera" userInitials="SR" userEmail="sam.rivera@parksmart.io" notificationCount={3}>
      {page === 'overview' && <Overview />}
      {page === 'buildings' && <Buildings />}
      {page === 'slots' && <ParkingSlots />}
      {page === 'pricing' && <Pricing />}
      {page === 'reports' && <Reports />}
      {['floors', 'zones', 'gates', 'vehicle-types', 'shifts', 'notifications'].includes(page) && (<div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="size-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 size={20} className="text-muted-foreground"/>
          </div>
          <p className="font-medium text-foreground">{p.title}</p>
          <p className="text-sm text-muted-foreground mt-1">Module loaded. Configuration options will appear here.</p>
        </div>)}
    </DashboardLayout>);
}
