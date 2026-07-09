import { useState } from 'react';
import { LayoutDashboard, LogIn, LogOut, QrCode, ScanLine, Clock, CreditCard, MessageSquare, AlertTriangle, Bell, Car, CheckCircle2, X, Camera, RotateCcw, ArrowRight } from 'lucide-react';
import DashboardLayout from './DashboardLayout';
const NAV = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'entry', label: 'Vehicle Entry', icon: LogIn },
    { id: 'exit', label: 'Vehicle Exit', icon: LogOut },
    { id: 'qr', label: 'QR Verification', icon: QrCode },
    { id: 'ocr', label: 'OCR Scanner', icon: ScanLine },
    { id: 'sessions', label: 'Parking Sessions', icon: Clock },
    { id: 'payments', label: 'Payment Processing', icon: CreditCard },
    { id: 'requests', label: 'Request Processing', icon: MessageSquare, badge: 3 },
    { id: 'exceptions', label: 'Exception Cases', icon: AlertTriangle },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 2 },
];
const ACTIVE_SESSIONS = [
    { id: 'SES-2401', plate: 'AB-1234-CD', driver: 'Alex Johnson', slot: 'B2-A04', entry: '09:00', duration: '2h 15m', fee: '$3.38', gate: 'Gate A' },
    { id: 'SES-2402', plate: 'EF-5678-GH', driver: 'Maria Santos', slot: 'A1-C08', entry: '08:30', duration: '2h 45m', fee: '$4.13', gate: 'Gate B' },
    { id: 'SES-2403', plate: 'IJ-9012-KL', driver: 'James Wilson', slot: 'C3-B12', entry: '10:00', duration: '1h 15m', fee: '$1.88', gate: 'Gate A' },
    { id: 'SES-2404', plate: 'MN-3456-OP', driver: 'Priya Nair', slot: 'D1-E06', entry: '07:45', duration: '3h 30m', fee: '$5.25', gate: 'Gate C' },
    { id: 'SES-2405', plate: 'QR-7890-ST', driver: 'David Chen', slot: 'B1-F02', entry: '11:30', duration: '45m', fee: '$1.13', gate: 'Gate A' },
];
const PENDING_REQUESTS = [
    { id: 'REQ-011', type: 'QR Issue', driver: 'Alex Johnson', date: 'Jun 12, 2026', priority: 'high', msg: 'QR code not scanning at Gate A.' },
    { id: 'REQ-012', type: 'Lost Ticket', driver: 'Tom Rivera', date: 'Jun 12, 2026', priority: 'medium', msg: 'Lost paper ticket.' },
    { id: 'REQ-013', type: 'Complaint', driver: 'Sara Kim', date: 'Jun 11, 2026', priority: 'low', msg: 'Overcharged for session SES-2380.' },
];
function StatusBadge({ status }) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700',
        completed: 'bg-slate-100 text-slate-600',
        pending: 'bg-blue-100 text-blue-700',
        high: 'bg-rose-100 text-rose-700',
        medium: 'bg-amber-100 text-amber-700',
        low: 'bg-slate-100 text-slate-600',
        paid: 'bg-emerald-100 text-emerald-700',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
function Overview() {
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Vehicles Today', value: '142', change: '+12 from yesterday', icon: Car, color: 'bg-blue-50 text-blue-600' },
            { label: 'Current Sessions', value: '38', change: '5 ending soon', icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Pending Requests', value: '7', change: '3 high priority', icon: MessageSquare, color: 'bg-amber-50 text-amber-600' },
            { label: 'Revenue Today', value: '$2,840', change: '+$340 from avg', icon: CreditCard, color: 'bg-violet-50 text-violet-600' },
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

      {/* Recent entries */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Today's Activity Feed</h3>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { plate: 'QR-7890-ST', action: 'Entered via Gate A', time: '11:30 AM', type: 'entry' },
            { plate: 'AB-1234-CD', action: 'Session extended 1 hour', time: '11:15 AM', type: 'update' },
            { plate: 'UV-2345-WX', action: 'Exited via Gate B — $8.50', time: '11:00 AM', type: 'exit' },
            { plate: 'YZ-6789-AB', action: 'Payment processed $12.00', time: '10:45 AM', type: 'payment' },
            { plate: 'MN-3456-OP', action: 'Entered via Gate C', time: '07:45 AM', type: 'entry' },
        ].map((a, i) => (<div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'entry' ? 'bg-emerald-100' : a.type === 'exit' ? 'bg-rose-100' : a.type === 'payment' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                {a.type === 'entry' ? <LogIn size={13} className="text-emerald-600"/> :
                a.type === 'exit' ? <LogOut size={13} className="text-rose-600"/> :
                    a.type === 'payment' ? <CreditCard size={13} className="text-blue-600"/> :
                        <RotateCcw size={13} className="text-amber-600"/>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-mono font-medium text-foreground">{a.plate}</p>
                <p className="text-xs text-muted-foreground">{a.action}</p>
              </div>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </div>))}
        </div>
      </div>
    </div>);
}
function VehicleEntry() {
    const [step, setStep] = useState('scan');
    const [plate, setPlate] = useState('');
    const [detected, setDetected] = useState('');
    const [gate, setGate] = useState('Gate A');
    const detect = () => {
        setTimeout(() => setDetected('AB-' + Math.floor(1000 + Math.random() * 9000) + '-CD'), 800);
    };
    const confirm = () => { setPlate(detected); setStep('info'); };
    const proceed = () => setStep('gate');
    const finalize = () => setStep('done');
    const reset = () => { setStep('scan'); setPlate(''); setDetected(''); };
    if (step === 'done') {
        return (<div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} className="text-emerald-600"/>
          </div>
          <h3 className="font-bold text-foreground mb-1">Entry Confirmed</h3>
          <p className="text-sm text-muted-foreground mb-5">Vehicle {plate} has entered through {gate}.</p>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-5">
            {[['Plate', plate], ['Gate', gate], ['Entry Time', new Date().toLocaleTimeString()], ['Session ID', 'SES-' + Math.floor(2400 + Math.random() * 100)]].map(([k, v]) => (<div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium font-mono text-foreground">{v}</span>
              </div>))}
          </div>
          <button onClick={reset} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Process Next Vehicle</button>
        </div>
      </div>);
    }
    return (<div className="max-w-2xl space-y-4">
      <div className="flex gap-2 mb-2">
        {['scan', 'info', 'gate'].map((s, i) => (<div key={s} className="flex items-center gap-2">
            <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (step === 'gate' && i < 2) || (step === 'info' && i < 1) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
            <span className={`text-xs ${step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{['OCR Scan', 'Vehicle Info', 'Gate Select'][i]}</span>
            {i < 2 && <div className={`w-8 h-px ${(step === 'info' && i === 0) || step === 'gate' ? 'bg-primary' : 'bg-border'}`}/>}
          </div>))}
      </div>

      {step === 'scan' && (<div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-5">License Plate OCR Scan</h3>

          {/* Camera mock */}
          <div className="relative bg-slate-900 rounded-xl aspect-video flex items-center justify-center mb-5 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-20 border-2 border-emerald-400 rounded-lg relative">
                <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400"/>
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400"/>
                <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400"/>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400"/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-emerald-400 text-xs font-mono font-bold">{detected || 'SCANNING...'}</div>
                </div>
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="size-2 bg-rose-500 rounded-full animate-pulse"/>
              <span className="text-white/60 text-xs">LIVE</span>
            </div>
            <Camera size={32} className="text-white/10 absolute"/>
          </div>

          {detected ? (<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 font-medium mb-0.5">Plate Detected</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{detected}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Confidence: 97.3% · Toyota Camry 2022</p>
                </div>
                <CheckCircle2 size={24} className="text-emerald-500"/>
              </div>
            </div>) : null}

          <div className="flex gap-3">
            <button onClick={detect} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <ScanLine size={15}/> Auto-Scan Plate
            </button>
            <button onClick={() => setStep('info')} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
              Enter Manually
            </button>
          </div>
          {detected && (<button onClick={confirm} className="w-full mt-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              Confirm & Continue <ArrowRight size={14}/>
            </button>)}
        </div>)}

      {step === 'info' && (<div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-5">Vehicle Information</h3>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">License Plate</label>
              <input value={plate || detected} onChange={e => setPlate(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-mono font-bold uppercase outline-none focus:border-primary"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vehicle Type</label>
                <select className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {['Sedan', 'SUV', 'Compact', 'Truck', 'Motorcycle'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Booking Ref (opt.)</label>
                <input placeholder="BK-XXXXXX" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"/>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('scan')} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">Back</button>
            <button onClick={proceed} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Next →</button>
          </div>
        </div>)}

      {step === 'gate' && (<div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-5">Gate Selection & Confirmation</h3>
          <div className="mb-5">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Select Entry Gate</label>
            <div className="grid grid-cols-3 gap-3">
              {['Gate A', 'Gate B', 'Gate C'].map(g => (<button key={g} onClick={() => setGate(g)} className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${gate === g ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 text-foreground'}`}>
                  {g}
                </button>))}
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 mb-5">
            <p className="text-xs text-muted-foreground mb-2">Confirmation Summary</p>
            {[['Plate', plate || detected || 'N/A'], ['Gate', gate], ['Time', new Date().toLocaleTimeString()]].map(([k, v]) => (<div key={k} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono font-medium text-foreground">{v}</span>
              </div>))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('info')} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">Back</button>
            <button onClick={finalize} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">Open Gate & Confirm</button>
          </div>
        </div>)}
    </div>);
}
function VehicleExit() {
    const [query, setQuery] = useState('');
    const [found, setFound] = useState(null);
    const [paid, setPaid] = useState(false);
    const search = () => {
        const res = ACTIVE_SESSIONS.find(s => s.plate.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase()));
        setFound(res ?? null);
    };
    if (paid) {
        return (<div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} className="text-emerald-600"/>
          </div>
          <h3 className="font-bold text-foreground mb-1">Exit Processed</h3>
          <p className="text-sm text-muted-foreground mb-5">Payment confirmed. Gate opening...</p>
          <button onClick={() => { setQuery(''); setFound(null); setPaid(false); }} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Process Next</button>
        </div>
      </div>);
    }
    return (<div className="max-w-2xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Session Lookup</h3>
        <div className="flex gap-3">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Enter plate number or session ID..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"/>
          <button onClick={search} className="bg-primary text-primary-foreground px-5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Search</button>
        </div>
      </div>

      {found && (<div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{found.id}</p>
              <h3 className="font-bold font-mono text-foreground text-xl">{found.plate}</h3>
              <p className="text-sm text-muted-foreground">{found.driver}</p>
            </div>
            <StatusBadge status="active"/>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[['Slot', found.slot], ['Entry Time', found.entry], ['Duration', found.duration], ['Current Fee', found.fee]].map(([k, v]) => (<div key={k} className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="font-semibold text-foreground mt-0.5">{v}</p>
              </div>))}
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between mb-4">
            <span className="font-medium text-foreground">Total Fee</span>
            <span className="text-2xl font-bold text-primary">{found.fee}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Print Receipt</button>
            <button onClick={() => setPaid(true)} className="py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">Confirm Payment & Exit</button>
          </div>
        </div>)}

      {query && !found && (<div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-2xl">
          <X size={24} className="mx-auto mb-2 opacity-40"/>
          <p>No active session found for "{query}"</p>
        </div>)}
    </div>);
}
function OCRScanner() {
    const [scanning, setScanning] = useState(false);
    const [plate, setPlate] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [corrected, setCorrected] = useState('');
    const scan = () => {
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            const p = 'AB-' + Math.floor(1000 + Math.random() * 9000) + '-CD';
            setPlate(p);
            setCorrected(p);
            setConfidence(85 + Math.floor(Math.random() * 14));
        }, 1500);
    };
    return (<div className="max-w-2xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-4">OCR Camera Interface</h3>

        {/* Camera view */}
        <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden mb-5">
          {scanning ? (<div className="flex flex-col items-center gap-3">
              <div className="size-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
              <p className="text-emerald-400 text-sm">Analyzing license plate...</p>
            </div>) : plate ? (<div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-emerald-400 rounded-lg px-6 py-3">
                <span className="text-emerald-400 text-2xl font-mono font-bold">{plate}</span>
              </div>
            </div>) : (<div className="text-white/30 text-center">
              <Camera size={40} className="mx-auto mb-2"/>
              <p className="text-sm">Camera feed ready</p>
            </div>)}
          {plate && (<div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              {confidence}% confidence
            </div>)}
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={scan} disabled={scanning} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <ScanLine size={15}/> {scanning ? 'Scanning...' : 'Capture & Scan'}
          </button>
          <button onClick={() => { setPlate(''); setCorrected(''); setConfidence(0); }} className="px-4 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            <RotateCcw size={15} className="text-muted-foreground"/>
          </button>
        </div>

        {plate && (<div className="border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Detection Result</p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${confidence >= 95 ? 'bg-emerald-500' : confidence >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${confidence}%` }}/>
                </div>
                <span className="text-xs font-mono text-foreground">{confidence}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Detected Plate</label>
                <div className="bg-muted px-3 py-2 rounded-lg text-sm font-mono font-bold text-foreground">{plate}</div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Correct / Confirm</label>
                <input value={corrected} onChange={e => setCorrected(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold outline-none focus:border-primary uppercase"/>
              </div>
            </div>
            <button className="w-full mt-3 bg-emerald-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
              Confirm & Log Entry
            </button>
          </div>)}
      </div>
    </div>);
}
function Sessions() {
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Active Sessions</h2>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{ACTIVE_SESSIONS.length} active</span>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Session</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Plate</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Driver</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Slot</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Entry</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Duration</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ACTIVE_SESSIONS.map(s => (<tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 font-mono text-sm font-medium text-primary">{s.id}</td>
                <td className="px-5 py-3.5 font-mono text-sm font-bold text-foreground">{s.plate}</td>
                <td className="px-5 py-3.5 text-sm text-foreground">{s.driver}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.slot}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.entry}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">{s.duration}</td>
                <td className="px-5 py-3.5 text-right text-sm font-semibold text-foreground">{s.fee}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function RequestProcessing() {
    const [requests, setRequests] = useState(PENDING_REQUESTS);
    const resolve = (id) => setRequests(requests.filter(r => r.id !== id));
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Pending Requests</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{requests.length} pending</span>
      </div>
      <div className="space-y-3">
        {requests.map(r => (<div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm">{r.type}</p>
                  <StatusBadge status={r.priority}/>
                </div>
                <p className="text-xs text-muted-foreground">{r.id} · {r.driver} · {r.date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolve(r.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors">Resolve</button>
                <button className="px-3 py-1.5 border border-border text-muted-foreground text-xs rounded-lg hover:bg-muted transition-colors">Escalate</button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{r.msg}</p>
          </div>))}
        {requests.length === 0 && (<div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500"/>
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm mt-1">No pending requests.</p>
          </div>)}
      </div>
    </div>);
}
export default function StaffDashboard() {
    const [page, setPage] = useState('overview');
    const titles = {
        overview: { title: 'Staff Dashboard', subtitle: "Today's operations at a glance" },
        entry: { title: 'Vehicle Entry', subtitle: 'Process incoming vehicles' },
        exit: { title: 'Vehicle Exit', subtitle: 'Process departing vehicles' },
        qr: { title: 'QR Verification', subtitle: 'Validate parking QR codes' },
        ocr: { title: 'OCR Scanner', subtitle: 'AI-powered license plate detection' },
        sessions: { title: 'Parking Sessions', subtitle: 'All active sessions' },
        payments: { title: 'Payment Processing', subtitle: 'Process and verify payments' },
        requests: { title: 'Request Processing', subtitle: 'Handle driver requests' },
        exceptions: { title: 'Exception Cases', subtitle: 'Handle special scenarios' },
        notifications: { title: 'Notifications', subtitle: 'System alerts and updates' },
    };
    const p = titles[page] ?? { title: 'Staff', subtitle: '' };
    return (<DashboardLayout role="staff" navItems={NAV} currentPage={page} setCurrentPage={setPage} title={p.title} subtitle={p.subtitle} userName="Jordan Lee" userInitials="JL" userEmail="jordan.lee@parksmart.io" notificationCount={2}>
      {page === 'overview' && <Overview />}
      {page === 'entry' && <VehicleEntry />}
      {page === 'exit' && <VehicleExit />}
      {page === 'ocr' && <OCRScanner />}
      {page === 'sessions' && <Sessions />}
      {page === 'requests' && <RequestProcessing />}
      {['qr', 'payments', 'exceptions', 'notifications'].includes(page) && (<div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="size-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
            {page === 'qr' ? <QrCode size={20} className="text-muted-foreground"/> :
                page === 'payments' ? <CreditCard size={20} className="text-muted-foreground"/> :
                    page === 'exceptions' ? <AlertTriangle size={20} className="text-muted-foreground"/> :
                        <Bell size={20} className="text-muted-foreground"/>}
          </div>
          <p className="font-medium text-foreground capitalize">{p.title}</p>
          <p className="text-sm text-muted-foreground mt-1">This section is operational. No items to display.</p>
        </div>)}
    </DashboardLayout>);
}
