import { useEffect, useState } from 'react';
import { bookingApi } from '../../api/driver/bookingApi';
import { driverVehicleApi } from '../../api/driver/driverVehicleApi';
import { paymentApi } from '../../api/driver/paymentApi';
import { requestApi } from '../../api/driver/requestApi';
import { notificationApi } from '../../api/notificationApi';
import { Car, MapPin, CreditCard, Bell, User, BookOpen, Clock, Plus, ChevronRight, CheckCircle2, AlertCircle, Wallet, MessageSquare, Navigation, X, Check } from 'lucide-react';
import DashboardLayout from './DashboardLayout';
const NAV = [
    { id: 'overview', label: 'Overview', icon: Navigation },
    { id: 'vehicles', label: 'My Vehicles', icon: Car },
    { id: 'parking', label: 'Parking Slots', icon: MapPin },
    { id: 'booking', label: 'Book a Slot', icon: BookOpen },
    { id: 'session', label: 'Current Session', icon: Clock },
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'requests', label: 'Request Center', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 4 },
    { id: 'profile', label: 'My Profile', icon: User },
];
const VEHICLES = [
    { id: 'V001', plate: 'AB-1234-CD', type: 'Sedan', make: 'Toyota Camry', color: 'Silver', year: 2022, status: 'active' },
    { id: 'V002', plate: 'EF-5678-GH', type: 'SUV', make: 'Honda CR-V', color: 'Black', year: 2021, status: 'active' },
    { id: 'V003', plate: 'IJ-9012-KL', type: 'Compact', make: 'Kia Rio', color: 'White', year: 2020, status: 'inactive' },
];
const BOOKINGS = [
    { id: 'BK-001', slot: 'B2-A04', building: 'Central Tower', date: 'Jun 12, 2026', time: '09:00–17:00', amount: '$12.00', status: 'active' },
    { id: 'BK-002', slot: 'A1-C08', building: 'North Plaza', date: 'Jun 10, 2026', time: '08:30–12:00', amount: '$7.50', status: 'completed' },
    { id: 'BK-003', slot: 'C3-B12', building: 'East Wing', date: 'Jun 8, 2026', time: '14:00–18:00', amount: '$9.00', status: 'completed' },
    { id: 'BK-004', slot: 'A2-D01', building: 'West Gate', date: 'Jun 5, 2026', time: '10:00–13:00', amount: '$6.00', status: 'cancelled' },
];
const NOTIFICATIONS = [
    { id: 1, title: 'Booking confirmed', desc: 'Your slot B2-A04 at Central Tower is confirmed for today.', time: '2 min ago', read: false, type: 'success' },
    { id: 2, title: 'Session reminder', desc: 'Your parking session ends in 30 minutes. Slot B2-A04.', time: '15 min ago', read: false, type: 'warning' },
    { id: 3, title: 'Payment processed', desc: '$12.00 charged for booking BK-001. Receipt available.', time: '1 hr ago', read: false, type: 'info' },
    { id: 4, title: 'Vehicle added', desc: 'Honda CR-V (EF-5678-GH) added to your account.', time: '2 days ago', read: false, type: 'info' },
    { id: 5, title: 'Slot released', desc: 'Your reserved slot A1-C08 was automatically released.', time: '4 days ago', read: true, type: 'neutral' },
];
const PAYMENT_HISTORY = [
    { id: 'TXN-0041', date: 'Jun 12, 2026', desc: 'Central Tower — B2-A04', duration: '8h', amount: '$12.00', status: 'paid' },
    { id: 'TXN-0038', date: 'Jun 10, 2026', desc: 'North Plaza — A1-C08', duration: '3.5h', amount: '$7.50', status: 'paid' },
    { id: 'TXN-0035', date: 'Jun 8, 2026', desc: 'East Wing — C3-B12', duration: '4h', amount: '$9.00', status: 'paid' },
    { id: 'TXN-0030', date: 'Jun 5, 2026', desc: 'West Gate — A2-D01', duration: '3h', amount: '$6.00', status: 'refunded' },
    { id: 'TXN-0024', date: 'May 29, 2026', desc: 'Central Tower — B1-A10', duration: '5h', amount: '$10.00', status: 'paid' },
];
function StatusBadge({ status }) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700',
        completed: 'bg-slate-100 text-slate-600',
        cancelled: 'bg-rose-100 text-rose-700',
        paid: 'bg-emerald-100 text-emerald-700',
        refunded: 'bg-amber-100 text-amber-700',
        inactive: 'bg-slate-100 text-slate-600',
        pending: 'bg-blue-100 text-blue-700',
    };
    return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>);
}
// QR Code mock
function QRCodeMock({ value }) {
    const grid = Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => {
        const v = ((r * 3 + c * 7 + r * c) % 3) === 0;
        return v;
    }));
    return (<div className="p-3 bg-white inline-block rounded-xl border border-border">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)', width: 100 }}>
        {grid.flat().map((filled, i) => (<div key={i} className={`aspect-square ${filled ? 'bg-foreground' : 'bg-white'}`} style={{ width: 9, height: 9 }}/>))}
      </div>
      <p className="text-[9px] text-muted-foreground text-center mt-1 font-mono">{value}</p>
    </div>);
}
// Overview page
function Overview({ setPage }) {
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
            { label: 'Registered Vehicles', value: '3', icon: Car, color: 'bg-blue-50 text-blue-600', action: 'vehicles' },
            { label: 'Active Booking', value: '1', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600', action: 'booking' },
            { label: 'Current Session', value: '2h 15m', icon: Clock, color: 'bg-indigo-50 text-indigo-600', action: 'session' },
            { label: 'Notifications', value: '4', icon: Bell, color: 'bg-amber-50 text-amber-600', action: 'notifications' },
            { label: 'Monthly Expenses', value: '$127.50', icon: Wallet, color: 'bg-violet-50 text-violet-600', action: 'payments' },
        ].map(s => {
            const Icon = s.icon;
            return (<button key={s.label} onClick={() => setPage(s.action)} className="bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md hover:shadow-primary/5 transition-all group">
              <div className={`size-9 rounded-xl flex items-center justify-center ${s.color} mb-3`}>
                <Icon size={16}/>
              </div>
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </button>);
        })}
      </div>

      {/* Current session card */}
      <div className="bg-gradient-to-r from-primary to-[#4338CA] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs mb-1">Active Parking Session</p>
            <h2 className="font-bold mb-0.5" style={{ fontSize: '1.25rem' }}>Central Tower — B2</h2>
            <p className="text-white/70 text-sm">Slot A04 · Toyota Camry · AB-1234-CD</p>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-2xl font-bold font-mono">02:15</div>
            <div className="text-xs text-white/70">Duration</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Entry</p>
            <p className="font-semibold text-sm mt-0.5">09:00 AM</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Est. Fee</p>
            <p className="font-semibold text-sm mt-0.5">$3.38</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Rate</p>
            <p className="font-semibold text-sm mt-0.5">$1.50/hr</p>
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground" style={{ fontSize: '0.875rem' }}>Recent Bookings</h3>
          <button onClick={() => setPage('booking')} className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight size={12}/>
          </button>
        </div>
        <div className="divide-y divide-border">
          {BOOKINGS.slice(0, 3).map(b => (<div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors">
              <div className="size-9 bg-muted rounded-xl flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-muted-foreground"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{b.building} · {b.slot}</p>
                <p className="text-xs text-muted-foreground">{b.date} · {b.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{b.amount}</p>
                <StatusBadge status={b.status}/>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}
// Vehicles page
function Vehicles() {
    const [showModal, setShowModal] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    useEffect(() => { driverVehicleApi.getMyVehicles().then(r => setVehicles((r.data?.data || r.data || []).map(v => ({ id: v.vehicleId || v.id, plate: v.licensePlate || v.plate, type: v.vehicleTypeName || v.type || 'Vehicle', make: v.name || v.make || v.model || 'Vehicle', color: v.color || '-', year: v.year || '-', status: v.status || 'active' })))).catch(() => setVehicles([])); }, []);
    const [form, setForm] = useState({ plate: '', type: 'Sedan', make: '', color: '', year: '' });
    const addVehicle = async (e) => {
        e.preventDefault();
        try { const res = await driverVehicleApi.create({ licensePlate: form.plate, vehicleTypeName: form.type, name: form.make, color: form.color, year: form.year }); const v = res.data?.data || res.data || {}; setVehicles([...vehicles, { id: v.vehicleId || v.id || form.plate, plate: v.licensePlate || form.plate, type: form.type, make: form.make || 'Vehicle', color: form.color, year: form.year, status: v.status || 'active' }]); } catch (err) { alert(err.response?.data?.message || 'Không thêm được xe'); return; }
        setShowModal(false);
        setForm({ plate: '', type: 'Sedan', make: '', color: '', year: '' });
    };
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">My Vehicles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{vehicles.length} registered vehicles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={14}/> Add Vehicle
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(v => (<div key={v.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="size-10 bg-muted rounded-xl flex items-center justify-center">
                <Car size={18} className="text-muted-foreground"/>
              </div>
              <StatusBadge status={v.status}/>
            </div>
            <div className="font-mono text-lg font-bold text-foreground mb-1">{v.plate}</div>
            <p className="text-sm text-foreground">{v.make}</p>
            <p className="text-xs text-muted-foreground">{v.type} · {v.color} · {v.year}</p>
            <div className="flex items-center gap-2 mt-4">
              <button className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">Edit</button>
              <button className="flex-1 py-1.5 text-xs border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">Remove</button>
            </div>
          </div>))}
        <button onClick={() => setShowModal(true)} className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
          <Plus size={24}/>
          <span className="text-sm font-medium">Add new vehicle</span>
        </button>
      </div>

      {showModal && (<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">Add New Vehicle</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X size={16} className="text-muted-foreground"/></button>
            </div>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">License Plate *</label>
                <input required value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} placeholder="AB-1234-CD" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Vehicle Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
                    {['Sedan', 'SUV', 'Compact', 'Truck', 'Motorcycle'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Year</label>
                  <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2024" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Make & Model *</label>
                <input required value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="Toyota Camry" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Color</label>
                <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="Silver" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
// Booking wizard
function Booking() {
    const [vehicles, setVehicles] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    useEffect(() => { driverVehicleApi.getMyVehicles().then(r => setVehicles((r.data?.data || r.data || []).map(v => ({ id: v.vehicleId || v.id, plate: v.licensePlate || v.plate, make: v.name || v.make || 'Vehicle', status: v.status || 'active' })))).catch(() => setVehicles([])); bookingApi.getAvailableSlots().then(r => setAvailableSlots(r.data?.data || r.data || [])).catch(() => setAvailableSlots([])); }, []);
    const [step, setStep] = useState(0);
    const [sel, setSel] = useState({ building: '', floor: '', zone: '', slot: '', vehicle: '' });
    const buildings = ['Central Tower', 'North Plaza', 'East Wing', 'West Gate'];
    const floors = ['B1 — Basement 1', 'G — Ground', '1F — Floor 1', '2F — Floor 2', '3F — Floor 3'];
    const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
    const SLOT_DATA = availableSlots.map((s) => ({ id: s.slotCode || s.code || s.slotId || s.id, status: (s.status || 'available').toLowerCase(), raw: s }));
    const steps = ['Building', 'Floor & Zone', 'Select Slot', 'Confirm'];
    if (step === 3) {
        return (<div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} className="text-emerald-600"/>
          </div>
          <h3 className="font-bold text-foreground mb-1" style={{ fontSize: '1.25rem' }}>Booking Confirmed!</h3>
          <p className="text-muted-foreground text-sm mb-6">Your slot has been reserved. Show this QR code at the gate.</p>
          <div className="flex justify-center mb-6">
            <QRCodeMock value={`BK-${Date.now().toString().slice(-6)}`}/>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Building</span><span className="font-medium text-foreground">{sel.building}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Floor</span><span className="font-medium text-foreground">{sel.floor}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Slot</span><span className="font-medium text-foreground">{sel.zone} · {sel.slot}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vehicle</span><span className="font-medium text-foreground">{sel.vehicle || 'AB-1234-CD'}</span></div>
          </div>
          <button onClick={() => { setStep(0); setSel({ building: '', floor: '', zone: '', slot: '', vehicle: '' }); }} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors">
            New Booking
          </button>
        </div>
      </div>);
    }
    return (<div className="max-w-2xl mx-auto space-y-5">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (<div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <Check size={12}/> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-primary' : 'bg-border'}`}/>}
          </div>))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {step === 0 && (<div>
            <h3 className="font-semibold text-foreground mb-4">Select a Building</h3>
            <div className="grid grid-cols-2 gap-3">
              {buildings.map(b => (<button key={b} onClick={() => setSel({ ...sel, building: b })} className={`p-4 rounded-xl border-2 text-left transition-all ${sel.building === b ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                  <div className="size-8 bg-muted rounded-lg flex items-center justify-center mb-2">
                    <MapPin size={14} className="text-muted-foreground"/>
                  </div>
                  <p className="font-medium text-sm text-foreground">{b}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">120 slots available</p>
                </button>))}
            </div>
            <button onClick={() => setStep(1)} disabled={!sel.building} className="w-full mt-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Next →</button>
          </div>)}

        {step === 1 && (<div>
            <h3 className="font-semibold text-foreground mb-4">Floor & Zone</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Floor</label>
                <div className="space-y-2">
                  {floors.map(f => (<button key={f} onClick={() => setSel({ ...sel, floor: f })} className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${sel.floor === f ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40 text-foreground'}`}>
                      {f}
                    </button>))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Zone</label>
                <div className="space-y-2">
                  {zones.map(z => (<button key={z} onClick={() => setSel({ ...sel, zone: z })} className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${sel.zone === z ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40 text-foreground'}`}>
                      {z}
                    </button>))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Back</button>
              <button onClick={() => setStep(2)} disabled={!sel.floor || !sel.zone} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Next →</button>
            </div>
          </div>)}

        {step === 2 && (<div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Select a Slot</h3>
              <div className="flex items-center gap-3 text-xs">
                {[['bg-emerald-400', 'Available'], ['bg-rose-400', 'Occupied'], ['bg-amber-400', 'Reserved']].map(([c, l]) => (<div key={l} className="flex items-center gap-1">
                    <div className={`size-3 rounded-sm ${c}`}/>
                    <span className="text-muted-foreground">{l}</span>
                  </div>))}
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1.5 mb-5 p-4 bg-muted/30 rounded-xl">
              {SLOT_DATA.map(slot => (<button key={slot.id} disabled={slot.status !== 'available'} onClick={() => setSel({ ...sel, slot: slot.id })} className={`rounded-md aspect-[1.5] flex items-center justify-center text-[9px] font-mono font-bold transition-all ${sel.slot === slot.id ? 'bg-primary text-white ring-2 ring-primary/40' :
                    slot.status === 'available' ? 'bg-emerald-400/80 text-white hover:bg-emerald-500 cursor-pointer' :
                        slot.status === 'occupied' ? 'bg-rose-400/80 text-white cursor-not-allowed' :
                            'bg-amber-400/80 text-white cursor-not-allowed'}`}>
                  {slot.id}
                </button>))}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">Select Vehicle</label>
              <select className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" onChange={e => setSel({ ...sel, vehicle: e.target.value })}>
                <option value="">Choose a vehicle</option>
                {vehicles.filter(v => v.status === 'active').map(v => (<option key={v.id} value={v.plate}>{v.make} — {v.plate}</option>))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Back</button>
              <button onClick={() => setStep(3)} disabled={!sel.slot} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Confirm Booking</button>
            </div>
          </div>)}
      </div>
    </div>);
}
// Current session
function CurrentSession() {
    return (<div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-primary to-[#4338CA] rounded-2xl p-7 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs mb-1">ACTIVE SESSION</p>
            <h2 className="font-bold mb-1" style={{ fontSize: '1.375rem' }}>Central Tower — Floor B2</h2>
            <p className="text-white/70 text-sm">Zone A · Slot A04</p>
          </div>
          <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
            <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse"/>
            Active
          </span>
        </div>
        <div className="text-center mb-6">
          <div className="text-5xl font-bold font-mono mb-1">02:15:33</div>
          <p className="text-white/60 text-sm">Duration</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Entry Time</p>
            <p className="font-semibold mt-0.5">09:00 AM</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Estimated Fee</p>
            <p className="font-semibold mt-0.5">$3.38</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Rate</p>
            <p className="font-semibold mt-0.5">$1.50/hr</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vehicle Info</h3>
          <div className="space-y-2">
            {[['Make', 'Toyota Camry'], ['Plate', 'AB-1234-CD'], ['Type', 'Sedan'], ['Color', 'Silver']].map(([k, v]) => (<div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-foreground">{v}</span>
              </div>))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Slot Info</h3>
          <div className="space-y-2">
            {[['Building', 'Central Tower'], ['Floor', 'B2 — Basement 2'], ['Zone', 'Zone A'], ['Gate', 'Gate North']].map(([k, v]) => (<div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-foreground">{v}</span>
              </div>))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center">
        <p className="text-sm font-semibold text-foreground mb-4">Your Exit QR Code</p>
        <QRCodeMock value="SES-241612"/>
        <p className="text-xs text-muted-foreground mt-3">Scan at exit gate to finalize session and process payment.</p>
      </div>
    </div>);
}
// Payment history
function Payments() {
    const [payments, setPayments] = useState([]);
    useEffect(() => { paymentApi.getMyPayments().then(r => setPayments((r.data?.data || r.data || []).map(p => ({ id: p.transactionRef || p.paymentId || p.id, date: (p.paidAt || p.createdAt || '').toString().slice(0,10), desc: p.paymentType || p.description || 'Parking payment', duration: p.duration || '-', amount: `${p.totalAmount ?? p.amount ?? 0}`, status: p.paymentStatus || p.status || 'paid' })))).catch(() => setPayments([])); }, []);
    const total = payments.reduce((s,p)=>s+Number(String(p.amount).replace(/[^0-9.-]/g,'')||0),0);
    return (<div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
            { label: 'Total Spent', value: total.toLocaleString(), sub: 'This month', color: 'text-foreground' },
            { label: 'Transactions', value: payments.length, sub: 'This month', color: 'text-foreground' },
            { label: 'Avg per Visit', value: payments.length ? Math.round(total/payments.length).toLocaleString() : '0', sub: 'This month', color: 'text-foreground' },
        ].map(s => (<div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Transaction History</h3>
          <button className="text-xs text-primary hover:underline">Download CSV</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Transaction</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Duration</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map(t => (<tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-mono font-medium text-foreground">{t.id}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.desc}</td>
                <td className="px-5 py-3.5 text-sm text-foreground">{t.duration}</td>
                <td className="px-5 py-3.5 text-right text-sm font-semibold text-foreground">{t.amount}</td>
                <td className="px-5 py-3.5 text-right"><StatusBadge status={t.status}/></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
// Request center
function Requests() {
    const [type, setType] = useState('complaint');
    const [msg, setMsg] = useState('');
    const [requests, setRequests] = useState([]);
    useEffect(() => { requestApi.getMyRequests().then(r => setRequests((r.data?.data || r.data || []).map(x => ({ id: x.requestId || x.id, type: x.requestType || x.type, date: (x.createdAt || '').toString().slice(0,10), status: x.status || 'pending', msg: x.description || x.subject || '' })))).catch(() => setRequests([])); }, []);
    const submit = (e) => {
        e.preventDefault();
        setRequests([{ id: `REQ-0${requests.length + 12}`, type: type, date: 'Jun 12, 2026', status: 'pending', msg }, ...requests]);
        setMsg('');
    };
    return (<div className="grid lg:grid-cols-[400px_1fr] gap-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4 text-sm">Submit a Request</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Request Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
              {['Lost Ticket', 'QR Issue', 'Complaint', 'Support Request', 'Refund Request'].map(t => <option key={t} value={t.toLowerCase().replace(' ', '-')}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
            <textarea required value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Describe your issue in detail..." className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Submit Request</button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">My Requests</h3>
        </div>
        <div className="divide-y divide-border">
          {requests.map(r => (<div key={r.id} className="p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.type}</p>
                  <p className="text-xs text-muted-foreground">{r.id} · {r.date}</p>
                </div>
                <StatusBadge status={r.status}/>
              </div>
              <p className="text-sm text-muted-foreground">{r.msg}</p>
            </div>))}
        </div>
      </div>
    </div>);
}
// Notifications
function Notifications() {
    const [notifs, setNotifs] = useState([]);
    useEffect(() => { const userId = localStorage.getItem('userId'); if (userId) notificationApi.getByUser(userId).then(r => setNotifs((r.data?.data || r.data || []).map(n => ({ id: n.notificationId || n.id, title: n.title, body: n.body || n.message, time: (n.createdAt || '').toString().slice(0,16), read: !!n.isRead })))).catch(() => setNotifs([])); }, []);
    const iconMap = {
        success: <CheckCircle2 size={14} className="text-emerald-600"/>,
        warning: <AlertCircle size={14} className="text-amber-600"/>,
        info: <Bell size={14} className="text-blue-600"/>,
        neutral: <Bell size={14} className="text-muted-foreground"/>,
    };
    return (<div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Notifications</h2>
        <button onClick={() => setNotifs(notifs.map(n => ({ ...n, read: true })))} className="text-xs text-primary hover:underline">Mark all as read</button>
      </div>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {notifs.map(n => (<div key={n.id} onClick={() => setNotifs(notifs.map(x => x.id === n.id ? { ...x, read: true } : x))} className={`flex items-start gap-3.5 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${!n.read ? 'bg-primary/[0.02]' : ''}`}>
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : n.type === 'warning' ? 'bg-amber-100' : n.type === 'info' ? 'bg-blue-100' : 'bg-muted'}`}>
              {iconMap[n.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                {!n.read && <span className="size-1.5 bg-primary rounded-full shrink-0"/>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.desc}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
          </div>))}
      </div>
    </div>);
}
// Profile
function Profile() {
    return (<div className="max-w-2xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold">AJ</div>
          <div>
            <h2 className="font-bold text-foreground">Alex Johnson</h2>
            <p className="text-sm text-muted-foreground">alex.johnson@email.com</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Driver</span>
          </div>
          <button className="ml-auto bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors">Edit Profile</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[['Full Name', 'Alex Johnson'], ['Username', 'alexj_driver'], ['Email', 'alex.johnson@email.com'], ['Phone', '+1 555 0142'], ['Member Since', 'January 2025'], ['Status', 'Active']].map(([k, v]) => (<div key={k}>
              <p className="text-xs text-muted-foreground mb-0.5">{k}</p>
              <p className="text-sm font-medium text-foreground">{v}</p>
            </div>))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4 text-sm">Change Password</h3>
        <div className="space-y-3">
          {['Current Password', 'New Password', 'Confirm New Password'].map(f => (<div key={f}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{f}</label>
              <input type="password" placeholder="••••••••" className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
            </div>))}
          <button className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors mt-1">Update Password</button>
        </div>
      </div>
    </div>);
}
export default function DriverDashboard() {
    const [page, setPage] = useState('overview');
    const titles = {
        overview: { title: 'Dashboard', subtitle: 'Welcome back, Alex' },
        vehicles: { title: 'My Vehicles', subtitle: 'Manage your registered vehicles' },
        parking: { title: 'Parking Slots', subtitle: 'View available slots near you' },
        booking: { title: 'Book a Slot', subtitle: 'Reserve your parking in seconds' },
        session: { title: 'Current Session', subtitle: 'Active parking session details' },
        payments: { title: 'Payment History', subtitle: 'Your transaction records' },
        requests: { title: 'Request Center', subtitle: 'Get help and track your requests' },
        notifications: { title: 'Notifications', subtitle: 'Stay up to date' },
        profile: { title: 'My Profile', subtitle: 'Manage account settings' },
    };
    const pageInfo = titles[page] ?? { title: 'Dashboard', subtitle: '' };
    return (<DashboardLayout role="driver" navItems={NAV} currentPage={page} setCurrentPage={setPage} title={pageInfo.title} subtitle={pageInfo.subtitle} userName="Alex Johnson" userInitials="AJ" userEmail="alex.johnson@email.com" notificationCount={4}>
      {page === 'overview' && <Overview setPage={setPage}/>}
      {page === 'vehicles' && <Vehicles />}
      {page === 'booking' && <Booking />}
      {page === 'session' && <CurrentSession />}
      {page === 'payments' && <Payments />}
      {page === 'requests' && <Requests />}
      {page === 'notifications' && <Notifications />}
      {page === 'profile' && <Profile />}
      {page === 'parking' && (<div className="text-center py-16 text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-3 opacity-40"/>
          <p className="font-medium text-foreground">Parking Slots Map</p>
          <p className="text-sm mt-1">Use the Booking page to explore and reserve available slots.</p>
          <button onClick={() => setPage('booking')} className="mt-4 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">Book a Slot</button>
        </div>)}
    </DashboardLayout>);
}
