import { useState } from 'react';
import { LayoutDashboard, Users, Shield, FileText, Settings, BarChart3, TrendingUp, Activity, CheckCircle2, Plus, Search, AlertTriangle, RefreshCw, Bell, Edit2, Lock, Unlock, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from './DashboardLayout';
const NAV = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Role Management', icon: Shield },
    { id: 'logs', label: 'Activity Logs', icon: FileText },
    { id: 'config', label: 'System Config', icon: Settings },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
];
const USER_GROWTH = [
    { month: 'Jan', users: 820 }, { month: 'Feb', users: 920 }, { month: 'Mar', users: 1020 },
    { month: 'Apr', users: 1080 }, { month: 'May', users: 1180 }, { month: 'Jun', users: 1248 },
];
const SYSTEM_HEALTH = [
    { service: 'API Gateway', status: 'healthy', uptime: '99.98%', latency: '42ms' },
    { service: 'OCR Engine', status: 'healthy', uptime: '99.92%', latency: '210ms' },
    { service: 'Payment Service', status: 'healthy', uptime: '99.99%', latency: '68ms' },
    { service: 'Notification Hub', status: 'degraded', uptime: '98.1%', latency: '380ms' },
    { service: 'Analytics DB', status: 'healthy', uptime: '99.95%', latency: '15ms' },
    { service: 'Auth Service', status: 'healthy', uptime: '100%', latency: '28ms' },
];
const USERS_DATA = [
    { id: 'U-0001', name: 'Alex Johnson', email: 'alex.johnson@email.com', role: 'Driver', status: 'active', joined: 'Jan 15, 2025', sessions: 48 },
    { id: 'U-0002', name: 'Jordan Lee', email: 'jordan.lee@parksmart.io', role: 'Staff', status: 'active', joined: 'Mar 2, 2025', sessions: 0 },
    { id: 'U-0003', name: 'Sam Rivera', email: 'sam.rivera@parksmart.io', role: 'Manager', status: 'active', joined: 'Feb 10, 2024', sessions: 0 },
    { id: 'U-0004', name: 'Maria Santos', email: 'maria.santos@email.com', role: 'Driver', status: 'active', joined: 'Apr 5, 2025', sessions: 31 },
    { id: 'U-0005', name: 'Tom Rivera', email: 'tom.rivera@email.com', role: 'Driver', status: 'suspended', joined: 'May 20, 2025', sessions: 7 },
    { id: 'U-0006', name: 'Priya Nair', email: 'priya.nair@email.com', role: 'Driver', status: 'active', joined: 'Jun 1, 2025', sessions: 12 },
    { id: 'U-0007', name: 'James Wilson', email: 'james.wilson@parksmart.io', role: 'Staff', status: 'active', joined: 'Nov 12, 2024', sessions: 0 },
    { id: 'U-0008', name: 'Wei Zhang', email: 'wei.zhang@email.com', role: 'Driver', status: 'inactive', joined: 'Jan 3, 2025', sessions: 3 },
];
const ACTIVITY_LOGS = [
    { id: 'LOG-5041', user: 'Alex Johnson', action: 'Booking Created', detail: 'BK-0041 — Central Tower B2-A04', time: '11:15 AM', type: 'booking' },
    { id: 'LOG-5040', user: 'Jordan Lee', action: 'Vehicle Entry Processed', detail: 'AB-1234-CD via Gate A', time: '11:10 AM', type: 'entry' },
    { id: 'LOG-5039', user: 'Sam Rivera', action: 'Pricing Policy Updated', detail: 'SUV daily rate changed to $20.00', time: '10:55 AM', type: 'config' },
    { id: 'LOG-5038', user: 'Tom Rivera', action: 'Account Suspended', detail: 'Multiple failed payment attempts', time: '10:30 AM', type: 'security' },
    { id: 'LOG-5037', user: 'Admin', action: 'System Config Changed', detail: 'OCR confidence threshold: 85% → 80%', time: '10:00 AM', type: 'config' },
    { id: 'LOG-5036', user: 'Maria Santos', action: 'Payment Processed', detail: 'TXN-0038 — $9.00 via Card', time: '09:45 AM', type: 'payment' },
    { id: 'LOG-5035', user: 'Priya Nair', action: 'Request Submitted', detail: 'REQ-013 — Support Request', time: '09:30 AM', type: 'support' },
    { id: 'LOG-5034', user: 'Admin', action: 'New Building Added', detail: 'West Gate — 80 slots configured', time: '09:00 AM', type: 'config' },
];
const CONFIG_SETTINGS = [
    { group: 'OCR System', settings: [
            { key: 'Confidence Threshold', value: '80%', type: 'number' },
            { key: 'Retry Attempts', value: '3', type: 'number' },
            { key: 'Auto-Correct', value: 'Enabled', type: 'toggle' },
        ] },
    { group: 'Booking System', settings: [
            { key: 'Max Advance Days', value: '30 days', type: 'number' },
            { key: 'Cancellation Window', value: '2 hours', type: 'number' },
            { key: 'Guest Booking', value: 'Disabled', type: 'toggle' },
        ] },
    { group: 'Notifications', settings: [
            { key: 'Session Reminder', value: '30 min before', type: 'select' },
            { key: 'Low Slot Alert', value: '10%', type: 'number' },
            { key: 'Email Notifications', value: 'Enabled', type: 'toggle' },
        ] },
    { group: 'Security', settings: [
            { key: 'Session Timeout', value: '60 minutes', type: 'number' },
            { key: 'Max Failed Logins', value: '5', type: 'number' },
            { key: '2FA Required', value: 'Managers+', type: 'select' },
        ] },
];
function StatusBadge({ status }) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
        healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        degraded: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        down: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        Driver: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        Staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        Manager: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        Admin: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'}`}>{status}</span>;
}
function Overview() {
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Total Users', value: '1,248', change: '+68 this month', icon: Users, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
            { label: 'Total Revenue', value: '$284,600', change: '+18.4% YoY', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
            { label: 'Active Sessions', value: '38', change: 'Right now', icon: Activity, color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
            { label: 'System Health', value: '99.8%', change: '1 service degraded', icon: CheckCircle2, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
        ].map(s => {
            const Icon = s.icon;
            return (<div key={s.label} className="bg-card border border-border rounded-2xl p-4">
              <div className={`size-9 rounded-xl flex items-center justify-center ${s.color} mb-3`}><Icon size={16}/></div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className="text-xs text-emerald-600 mt-1">{s.change}</div>
            </div>);
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        {/* User growth */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">User Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={USER_GROWTH}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}/>
              <Area type="monotone" dataKey="users" stroke="#4F46E5" strokeWidth={2.5} fill="url(#userGrad)" name="Users"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* System health */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">System Health</h3>
            <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <RefreshCw size={13} className="text-muted-foreground"/>
            </button>
          </div>
          <div className="space-y-2.5">
            {SYSTEM_HEALTH.map(s => (<div key={s.service} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                <div className={`size-2 rounded-full shrink-0 ${s.status === 'healthy' ? 'bg-emerald-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.service}</p>
                  <p className="text-[10px] text-muted-foreground">{s.uptime} uptime · {s.latency}</p>
                </div>
                <StatusBadge status={s.status}/>
              </div>))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
          <span className="text-xs text-muted-foreground">Last 24 hours</span>
        </div>
        <div className="divide-y divide-border">
          {ACTIVITY_LOGS.slice(0, 5).map(log => (<div key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${log.type === 'entry' ? 'bg-emerald-100' :
                log.type === 'booking' ? 'bg-blue-100' :
                    log.type === 'payment' ? 'bg-violet-100' :
                        log.type === 'security' ? 'bg-rose-100' : 'bg-amber-100'}`}>
                {log.type === 'security' ? <AlertTriangle size={12} className="text-rose-600"/> :
                log.type === 'config' ? <Settings size={12} className="text-amber-600"/> :
                    log.type === 'entry' ? <Activity size={12} className="text-emerald-600"/> :
                        <FileText size={12} className="text-blue-600"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-medium text-foreground">{log.user}</p>
                  <span className="text-muted-foreground">·</span>
                  <p className="text-xs text-muted-foreground">{log.action}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{log.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
            </div>))}
        </div>
      </div>
    </div>);
}
function UserManagement() {
    const [users, setUsers] = useState(USERS_DATA);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const filtered = users.filter(u => (roleFilter === 'All' || u.role === roleFilter) &&
        (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));
    const toggleStatus = (id) => {
        setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
    };
    return (<div className="space-y-4">
      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
            { role: 'Driver', count: users.filter(u => u.role === 'Driver').length, color: 'bg-blue-50 text-blue-700' },
            { role: 'Staff', count: users.filter(u => u.role === 'Staff').length, color: 'bg-emerald-50 text-emerald-700' },
            { role: 'Manager', count: users.filter(u => u.role === 'Manager').length, color: 'bg-violet-50 text-violet-700' },
            { role: 'Admin', count: users.filter(u => u.role === 'Admin').length, color: 'bg-rose-50 text-rose-700' },
        ].map(r => (<div key={r.role} className={`${r.color} rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-bold">{r.count}</p>
            <p className="text-xs mt-0.5">{r.role}s</p>
          </div>))}
      </div>

      {/* Filters + table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 flex-1 max-w-xs">
            <Search size={13} className="text-muted-foreground"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"/>
          </div>
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {['All', 'Driver', 'Staff', 'Manager', 'Admin'].map(r => (<button key={r} onClick={() => setRoleFilter(r)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${roleFilter === r ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>{r}</button>))}
          </div>
          <button className="flex items-center gap-1.5 ml-auto bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus size={12}/> Add User
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Joined</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Sessions</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(u => (<tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={u.role}/></td>
                <td className="px-5 py-3.5"><StatusBadge status={u.status}/></td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground">{u.joined}</td>
                <td className="px-5 py-3.5 text-right text-sm font-medium text-foreground">{u.sessions}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Edit2 size={13} className="text-muted-foreground"/></button>
                    <button onClick={() => toggleStatus(u.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      {u.status === 'active' ? <Lock size={13} className="text-amber-600"/> : <Unlock size={13} className="text-emerald-600"/>}
                    </button>
                    <button onClick={() => setUsers(users.filter(x => x.id !== u.id))} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Trash2 size={13} className="text-rose-500"/></button>
                  </div>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function ActivityLogs() {
    const [filter, setFilter] = useState('All');
    const types = ['All', 'entry', 'booking', 'payment', 'config', 'security', 'support'];
    const logs = filter === 'All' ? ACTIVITY_LOGS : ACTIVITY_LOGS.filter(l => l.type === filter);
    const typeIcons = {
        entry: <Activity size={13} className="text-emerald-600"/>,
        booking: <FileText size={13} className="text-blue-600"/>,
        payment: <TrendingUp size={13} className="text-violet-600"/>,
        config: <Settings size={13} className="text-amber-600"/>,
        security: <AlertTriangle size={13} className="text-rose-600"/>,
        support: <FileText size={13} className="text-cyan-600"/>,
    };
    const typeBg = {
        entry: 'bg-emerald-100', booking: 'bg-blue-100', payment: 'bg-violet-100',
        config: 'bg-amber-100', security: 'bg-rose-100', support: 'bg-cyan-100',
    };
    return (<div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {types.map(t => (<button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${filter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            {t}
          </button>))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {logs.map((log, i) => (<div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeBg[log.type] ?? 'bg-muted'}`}>
                {typeIcons[log.type]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground">{log.action}</span>
                  <span className="text-xs text-muted-foreground">by {log.user}</span>
                </div>
                <p className="text-xs text-muted-foreground">{log.detail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{log.time}</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{log.id}</p>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}
function SystemConfig() {
    return (<div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {CONFIG_SETTINGS.map(group => (<div key={group.group} className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4 pb-3 border-b border-border">{group.group}</h3>
            <div className="space-y-4">
              {group.settings.map(s => (<div key={s.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-foreground">{s.key}</p>
                  </div>
                  {s.type === 'toggle' ? (<button className={`relative inline-flex size-9 w-11 rounded-full transition-colors focus:outline-none ${s.value === 'Enabled' ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform m-0.5 mt-1 ${s.value === 'Enabled' ? 'translate-x-5' : 'translate-x-0'}`}/>
                    </button>) : (<input defaultValue={s.value} className="w-28 text-right bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary"/>)}
                </div>))}
            </div>
          </div>))}
      </div>
      <div className="flex items-center justify-end gap-3">
        <button className="px-5 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Reset Defaults</button>
        <button className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
      </div>
    </div>);
}
function RoleManagement() {
    const ROLES = [
        { name: 'Driver', users: 1180, description: 'Book slots, manage vehicles, view sessions', permissions: ['book_slot', 'view_sessions', 'manage_vehicles', 'submit_requests'] },
        { name: 'Staff', users: 48, description: 'Process vehicle entry/exit, verify QR codes', permissions: ['process_entry', 'process_exit', 'verify_qr', 'ocr_scan', 'process_payments'] },
        { name: 'Manager', users: 12, description: 'Manage facilities, pricing, and analytics', permissions: ['manage_buildings', 'manage_pricing', 'view_reports', 'manage_staff', 'all_staff_permissions'] },
        { name: 'Admin', users: 8, description: 'Full system access and user management', permissions: ['all_permissions', 'manage_users', 'system_config', 'view_logs', 'manage_roles'] },
    ];
    const colors = {
        Driver: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300',
        Staff: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300',
        Manager: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300',
        Admin: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300',
    };
    return (<div className="grid md:grid-cols-2 gap-4">
      {ROLES.map(r => (<div key={r.name} className={`rounded-2xl border p-5 ${colors[r.name]}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-foreground">{r.name}</h3>
              <p className="text-xs mt-0.5 opacity-70">{r.users.toLocaleString()} users</p>
            </div>
            <button className="text-xs border border-current/20 px-2.5 py-1 rounded-lg hover:bg-black/5 transition-colors">Edit</button>
          </div>
          <p className="text-xs mb-3 opacity-80">{r.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {r.permissions.map(p => (<span key={p} className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full font-mono">{p}</span>))}
          </div>
        </div>))}
    </div>);
}
export default function AdminDashboard() {
    const [page, setPage] = useState('overview');
    const titles = {
        overview: { title: 'Admin Dashboard', subtitle: 'Full system overview' },
        users: { title: 'User Management', subtitle: 'Manage accounts, roles, and permissions' },
        roles: { title: 'Role Management', subtitle: 'Configure roles and permissions' },
        logs: { title: 'Activity Logs', subtitle: 'Audit trail and system events' },
        config: { title: 'System Configuration', subtitle: 'Global system settings' },
        reports: { title: 'Reports', subtitle: 'Cross-facility analytics' },
        notifications: { title: 'Notifications', subtitle: 'System alerts' },
    };
    const p = titles[page] ?? { title: 'Admin', subtitle: '' };
    return (<DashboardLayout role="admin" navItems={NAV} currentPage={page} setCurrentPage={setPage} title={p.title} subtitle={p.subtitle} userName="Riley Admin" userInitials="RA" userEmail="admin@parksmart.io" notificationCount={0}>
      {page === 'overview' && <Overview />}
      {page === 'users' && <UserManagement />}
      {page === 'roles' && <RoleManagement />}
      {page === 'logs' && <ActivityLogs />}
      {page === 'config' && <SystemConfig />}
      {['reports', 'notifications'].includes(page) && (<div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="size-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BarChart3 size={20} className="text-muted-foreground"/>
          </div>
          <p className="font-medium text-foreground">{p.title}</p>
          <p className="text-sm text-muted-foreground mt-1">Module ready. No critical items.</p>
        </div>)}
    </DashboardLayout>);
}
