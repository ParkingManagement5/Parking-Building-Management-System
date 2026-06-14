import { useState } from 'react';
import { authApi } from '../../api/auth/authApi';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Car } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [showPw, setShowPw] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', remember: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await authApi.login({ username: form.username, password: form.password });
            const data = res.data?.data || res.data || {};
            const token = data.token || data.accessToken || data.jwt;
            const rawRole = data.role || data.roleName || data.roles?.[0] || data.user?.role || data.user?.roles?.[0] || 'DRIVER';
            const role = rawRole.toString().replace('ROLE_', '').toUpperCase();
            if (token) localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            if (data.userId || data.user?.userId || data.user?.id) localStorage.setItem('userId', data.userId || data.user?.userId || data.user?.id);
            if (data.username || data.user?.username) localStorage.setItem('username', data.username || data.user?.username);
            const next = role.includes('ADMIN') ? '/admin' : role.includes('MANAGER') ? '/manager' : role.includes('STAFF') ? '/staff' : '/driver';
            navigate(next);
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra tài khoản/mật khẩu.');
        } finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen bg-background flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, row) => Array.from({ length: 8 }).map((_, col) => (<div key={`${row}-${col}`} className="absolute border border-white/20" style={{
                width: 80, height: 50, borderRadius: 6,
                left: col * 100 - 20, top: row * 80 - 10,
            }}/>)))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="size-9 bg-white/20 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.7"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.7"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.5"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg">ParkSmart</span>
          </div>

          <h1 className="text-white mb-4" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>
            Welcome back to smarter parking
          </h1>
          <p className="text-white/70 leading-relaxed">
            Manage your facilities, track sessions, and process payments from one unified platform.
          </p>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-2 gap-4">
          {[
            { value: '240', label: 'Avg slots managed' },
            { value: '98%', label: 'Occupancy accuracy' },
            { value: '3.2s', label: 'Avg entry time' },
            { value: '4.9★', label: 'User satisfaction' },
        ].map(s => (<div key={s.label} className="bg-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
            </div>))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
              <Car size={16} className="text-white"/>
            </div>
            <span className="font-bold text-foreground">ParkSmart</span>
          </div>

          <h2 className="text-foreground mb-2" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sign in to your account</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')} className="text-primary hover:underline font-medium">
              Create one
            </button>
          </p>

          {error && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Enter your username" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} className="size-4 accent-primary rounded"/>
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-60 mt-2">
              {loading ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>) : (<>Sign in <ArrowRight size={16}/></>)}
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            By signing in you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>);
}
