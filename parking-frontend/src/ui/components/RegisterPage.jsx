import { useState } from 'react';
import { authApi } from '../../api/auth/authApi';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
const ROLES = ['Driver', 'Staff', 'Manager', 'Admin'];
export default function RegisterPage() {
    const navigate = useNavigate();
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({
        username: '', fullName: '', email: '', phone: '', role: 'Driver', password: '', confirm: '',
    });
    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) return;
        setLoading(true);
        setError('');
        try {
            await authApi.register({
                username: form.username,
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
                password: form.password,
                roleName: form.role.toUpperCase(),
                role: form.role.toUpperCase(),
            });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };
    if (done) {
        return (<div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-600"/>
          </div>
          <h2 className="text-foreground mb-2" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Account created!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Welcome to ParkSmart, {form.fullName}. Your account is ready.
          </p>
          <button onClick={() => navigate('/login')} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">
            Sign in now
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          {Array.from({ length: 20 }).map((_, i) => (<div key={i} className="absolute rounded-full border border-white" style={{ width: 80 + i * 30, height: 80 + i * 30, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}/>))}
        </div>

        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-12">
            <div className="size-9 bg-white/20 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.7"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.7"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.5"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg">ParkSmart</span>
          </button>

          <h1 className="text-white mb-4" style={{ fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.2 }}>
            Join 50,000+ parking users
          </h1>
          <p className="text-white/70 leading-relaxed">
            Create your account and start managing or using parking services today.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            'Book parking slots in seconds',
            'Real-time availability updates',
            'Secure digital payments',
            'QR code entry system',
        ].map(f => (<div key={f} className="flex items-center gap-3">
              <div className="size-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={12} className="text-white"/>
              </div>
              <span className="text-white/80 text-sm">{f}</span>
            </div>))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-foreground mb-1" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create your account</h2>
          <p className="text-muted-foreground text-sm mb-7">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-primary hover:underline font-medium">
              Sign in
            </button>
          </p>

          {error && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Username *</label>
                <input required value={form.username} onChange={update('username')} placeholder="jdoe123" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Full Name *</label>
                <input required value={form.fullName} onChange={update('fullName')} placeholder="John Doe" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Email Address *</label>
              <input required type="email" value={form.email} onChange={update('email')} placeholder="john@example.com" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+1 555 0100" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Role *</label>
                <select required value={form.role} onChange={update('role')} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Password *</label>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="Minimum 8 characters" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.password && (<div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map(l => (<div key={l} className={`flex-1 h-1 rounded-full transition-colors ${form.password.length >= l * 2
                    ? form.password.length >= 8 ? 'bg-emerald-500' : 'bg-amber-400'
                    : 'bg-muted'}`}/>))}
                </div>)}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Confirm Password *</label>
              <div className="relative">
                <input required type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={update('confirm')} placeholder="Re-enter your password" className={`w-full bg-muted border rounded-xl px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 transition-all ${form.confirm && form.confirm !== form.password
            ? 'border-destructive focus:ring-destructive/10 focus:border-destructive'
            : 'border-border focus:border-primary focus:ring-primary/10'}`}/>
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.confirm && form.confirm !== form.password && (<p className="text-xs text-destructive mt-1">Passwords do not match</p>)}
            </div>

            <button type="submit" disabled={loading || (!!form.confirm && form.confirm !== form.password)} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-60 mt-2">
              {loading
            ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            : <><ArrowRight size={16}/> Create account</>}
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-5 text-center">
            By registering you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>);
}
