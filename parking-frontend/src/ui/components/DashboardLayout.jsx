import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, Menu, X, ChevronDown, Search, Sun, Moon } from 'lucide-react';
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
    return (<div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-60'} shrink-0 transition-all duration-200 flex flex-col bg-card border-r border-border`} style={{ boxShadow: '1px 0 0 0 var(--border)' }}>
        {/* Sidebar header */}
        <div className={`h-14 flex items-center border-b border-border ${collapsed ? 'px-4 justify-center' : 'px-4 gap-3'}`}>
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
        {!collapsed && (<div className="px-3 py-2 border-b border-border">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
              <span className={`size-1.5 rounded-full ${meta.dot}`}/>
              {meta.label} Portal
            </span>
          </div>)}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (<button key={item.id} onClick={() => setCurrentPage(item.id)} title={collapsed ? item.label : undefined} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 transition-all text-left group ${active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon size={16} className="shrink-0"/>
                {!collapsed && (<>
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge ? (<span className="min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                        {item.badge}
                      </span>) : null}
                  </>)}
              </button>);
        })}
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
