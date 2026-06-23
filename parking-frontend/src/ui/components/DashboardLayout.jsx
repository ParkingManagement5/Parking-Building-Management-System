import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, Menu, X, ChevronDown, Search, Sun, Moon, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../../utils/theme';
import BrandLogo, { BrandLogoIcon } from './BrandLogo';
const ROLE_META = {
    driver: {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        dot: 'bg-blue-500',
        label: 'Driver',
        avatar: 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-blue-500 dark:text-slate-950 dark:shadow-blue-500/30',
    },
    staff: {
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Staff',
        avatar: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-500/30',
    },
    manager: {
        color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        dot: 'bg-violet-500',
        label: 'Manager',
        avatar: 'bg-violet-600 text-white shadow-sm shadow-violet-500/20 dark:bg-violet-500 dark:text-slate-950 dark:shadow-violet-500/30',
    },
    admin: {
        color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        dot: 'bg-rose-500',
        label: 'Admin',
        avatar: 'bg-rose-600 text-white shadow-sm shadow-rose-500/20 dark:bg-rose-500 dark:text-slate-950 dark:shadow-rose-500/30',
    },
};
export default function DashboardLayout({ role, navItems, currentPage, setCurrentPage, title, subtitle, userName = 'Alex Johnson', userInitials = 'AJ', userEmail = 'alex@parksmart.io', notificationCount = 0, notificationItems = [], onMarkNotificationRead, onMarkAllNotificationsRead, notificationPath, settingsPath, children, }) {
    const [collapsed, setCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const navigate = useNavigate();
    const meta = ROLE_META[role];
    const groupedNavItems = navItems.reduce((groups, item) => {
        const group = item.group || 'Navigation';
        if (!groups.some((entry) => entry.label === group)) {
            groups.push({ label: group, items: [] });
        }
        groups.find((entry) => entry.label === group).items.push(item);
        return groups;
    }, []);
    return (<div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[76px]' : role === 'driver' ? 'w-[292px]' : 'w-64'} shrink-0 transition-all duration-300 flex min-h-0 flex-col overflow-hidden border-r border-border ${role === 'driver' ? 'bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_42%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#09111f_0%,#101a2f_52%,#0b1020_100%)]' : 'bg-card'}`} style={{ boxShadow: '1px 0 0 0 var(--border)' }}>
        {/* Sidebar header */}
        <div className={`h-16 flex items-center border-b border-border/80 ${collapsed ? 'px-4 justify-center' : 'px-4 gap-3'}`}>
          {!collapsed && (<div className="flex items-center gap-2 flex-1 min-w-0">
              <BrandLogo compact size="sidebar" iconClassName="rounded-lg" titleClassName="tracking-tight" />
            </div>)}
          {collapsed && <BrandLogoIcon className="size-7 rounded-lg" iconSize={14} />}
          {!collapsed && (<button onClick={() => setCollapsed(true)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground">
              <X size={14}/>
            </button>)}
          {collapsed && (<button onClick={() => setCollapsed(false)} className="absolute left-14 top-3.5 size-7 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground z-10">
              <Menu size={14}/>
            </button>)}
        </div>

        {/* Role badge */}
        {!collapsed && role === 'driver' ? (<div className="px-4 py-3">
            <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/80 p-3 shadow-sm shadow-blue-900/5 dark:border-blue-400/15 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                    <span className={`size-1.5 rounded-full ${meta.dot}`}/>
                    {meta.label} Portal
                  </span>
                  <p className="mt-2 text-sm font-semibold text-foreground">Parking pass</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Book, enter, exit, and review payments from one flow.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('current-session')}
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
                  title="Open current session"
                >
                  <ArrowUpRight size={16}/>
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage('booking')}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-left transition hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
                >
                  <span className="block text-[11px] font-medium text-blue-700 dark:text-blue-200">Next step</span>
                  <span className="block truncate text-xs text-muted-foreground">Reserve slot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('payments')}
                  className="rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                >
                  <span className="block text-[11px] font-medium text-foreground">Records</span>
                  <span className="block truncate text-xs text-muted-foreground">Fees & receipts</span>
                </button>
              </div>
            </div>
          </div>) : !collapsed ? (<div className="px-3 py-2 border-b border-border">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`}/>
              {meta.label} Portal
            </span>
          </div>) : null}

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groupedNavItems.map((group) => (
            <div key={group.label} className={collapsed ? 'mt-2' : 'mt-2.5'}>
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.id;
                  return (<button key={item.id} onClick={() => setCurrentPage(item.id)} title={collapsed ? item.label : undefined} className={`relative w-full flex items-center gap-3 rounded-2xl transition-all text-left group ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'} ${active
                          ? role === 'driver'
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.06]'}`}>
                      {!collapsed && active && role === 'driver' ? <span className="absolute -left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-blue-300" /> : null}
                      <span className={`grid size-8 shrink-0 place-items-center rounded-xl transition ${active
                              ? role === 'driver' ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
                              : 'bg-white/70 text-muted-foreground group-hover:text-foreground dark:bg-white/[0.06]'}`}>
                        <Icon size={17}/>
                      </span>
                      {!collapsed && (<>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold leading-tight">{item.label}</span>
                            {item.description ? <span className={`block truncate text-[11px] ${active && role === 'driver' ? 'text-white/75' : 'text-muted-foreground'}`}>{item.description}</span> : null}
                          </span>
                          {item.badge ? (<span className={`min-w-[20px] h-5 px-1.5 text-[10px] rounded-full flex items-center justify-center font-medium ${active && role === 'driver' ? 'bg-white text-blue-700' : 'bg-primary text-white'}`}>
                              {item.badge}
                            </span>) : null}
                        </>)}
                    </button>);
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          {!collapsed ? (<div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${meta.avatar}`}>
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-foreground truncate">{userName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
                </div>
                <ChevronDown size={12} className="text-muted-foreground"/>
              </button>
              {userMenuOpen && (<div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                  <button onClick={() => { setUserMenuOpen(false); if (settingsPath) {
                    navigate(settingsPath);
                } }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Settings size={14}/>
                    Settings
                  </button>
                  <div className="border-t border-border my-1"/>
                  <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut size={14}/>
                    Sign out
                  </button>
                </div>)}
            </div>) : (<button onClick={() => { localStorage.clear(); navigate('/login'); }} title="Sign out" className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <LogOut size={16}/>
            </button>)}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center px-5 gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 w-56">
            <Search size={13} className="text-muted-foreground shrink-0"/>
            <input placeholder="Search..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1 w-full"/>
          </div>

          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg border border-border bg-background p-2 transition-colors hover:bg-muted"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? <Sun size={16} className="text-muted-foreground"/> : <Moon size={16} className="text-muted-foreground"/>}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setNotificationOpen((value) => !value)} className="relative rounded-lg p-2 transition-colors hover:bg-muted">
              <Bell size={16} className="text-muted-foreground"/>
              {notificationCount > 0 && (<span className="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold leading-none text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>)}
            </button>
            {notificationOpen && (<div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <p className="text-xs text-muted-foreground">{notificationCount} unread</p>
                  </div>
                  {notificationItems.length > 0 && onMarkAllNotificationsRead ? (<button onClick={async () => {
                    await onMarkAllNotificationsRead();
                    setNotificationOpen(false);
                }} className="text-xs font-medium text-primary transition-colors hover:underline">
                      Mark All As Read
                    </button>) : null}
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notificationItems.length > 0 ? (notificationItems.map((item) => (<button key={item.notificationId} onClick={async () => {
                        if (!item.isRead && onMarkNotificationRead) {
                            await onMarkNotificationRead(item.notificationId);
                        }
                    }} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${!item.isRead ? 'bg-primary/[0.03]' : ''}`}>
                        <div className={`mt-0.5 size-2.5 shrink-0 rounded-full ${item.isRead ? 'bg-muted-foreground/30' : 'bg-primary'}`}/>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{item.title || 'Notification'}</p>
                            {!item.isRead && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">New</span>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.body || item.message || 'No details available.'}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.createdAt ? String(item.createdAt).replace('T', ' ').slice(0, 16) : 'No timestamp'}</p>
                        </div>
                      </button>))) : (<div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      There are no notifications right now.
                    </div>)}
                </div>

                {notificationPath ? (<div className="border-t border-border px-4 py-3">
                    <button onClick={() => {
                    setNotificationOpen(false);
                    navigate(notificationPath);
                }} className="w-full rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                      Open Full Notifications
                    </button>
                  </div>) : null}
              </div>)}
          </div>

          {/* Avatar */}
          <div className={`size-7 rounded-full flex items-center justify-center text-xs font-medium ${meta.avatar}`}>
            {userInitials}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5">
            {children}
          </div>
        </main>
      </div>
    </div>);
}
