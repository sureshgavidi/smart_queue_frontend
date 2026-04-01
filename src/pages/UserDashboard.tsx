import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Clock, Users, Ticket, LogOut, ChevronRight, AlertCircle, CheckCircle2, Hospital, Info, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Token } from '@/contexts/AppContext';

const UserDashboard = () => {
  const { user, tokens, currentToken, hospitals, loading, bookToken, logout, getActiveUserToken, clearTokenAlert } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'booked' | 'tracking'>('form');
  const [bookedToken, setBookedToken] = useState<Token | null>(null);

  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
  };
  const isPhoneValid = phone.length === 10;
  const phoneError = phoneTouched && !isPhoneValid;

  useEffect(() => {
    const active = getActiveUserToken();
    setBookedToken(active || null);
    if (active && step === 'form') {
      setStep('tracking');
    }
  }, [getActiveUserToken, step, tokens, user]);

  const filteredHospitals = hospitals; // Show all hospitals for the demo
  const hospital = filteredHospitals.find(h => h.name === selectedHospital);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await bookToken(patientName, phone, selectedDepartment, selectedHospital);
      setBookedToken(token);
      setStep('booked');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  const showBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options: NotificationOptions = {
      body,
      icon: '/logo.png',
    };

    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.showNotification) {
          registration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      }).catch(() => {
        new Notification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  };

  const playAlarmSound = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (error) {
      console.warn('Alarm sound playback failed', error);
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (bookedToken?.alertMessage && !bookedToken?.alertSeen) {
      playAlarmSound();
      showBrowserNotification('MediQueue Alert', bookedToken.alertMessage);
    }
  }, [bookedToken?.alertMessage, bookedToken?.alertSeen]);

  const handleDismissAlert = () => {
    if (bookedToken) {
      clearTokenAlert(bookedToken.id);
    }
  };

  const currentServing = bookedToken ? currentToken[`${bookedToken.hospital}-${bookedToken.department}`] || 0 : 0;

  const tokensAheadList = bookedToken
    ? tokens.filter(t => t.hospital === bookedToken.hospital && t.department === bookedToken.department && t.status === 'waiting' && t.tokenNumber < bookedToken.tokenNumber)
    : [];
  const peopleAhead = tokensAheadList.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
              <img src="/logo.png" alt="MediQueue" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">MediQueue</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, {user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {bookedToken?.alertMessage && (
          <div className="glass-card p-4 mb-6 border-l-4 border-warning/60 bg-warning/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-warning">Alert</p>
                <p className="text-sm text-muted-foreground mt-1">{bookedToken.alertMessage}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismissAlert}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-foreground">Book Your Token</h1>
                <p className="text-muted-foreground mt-1">Fill in your details to get your queue position</p>
              </div>

              <form onSubmit={handleBook} className="space-y-6">
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Hospital className="w-5 h-5" />
                    <span className="font-semibold font-display">Patient Details</span>
                  </div>

                  <div>
                    <Label>Full Name</Label>
                    <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Enter your name" className="mt-1" required />
                  </div>

                  <div className="space-y-1">
                    <Label className={phoneError ? "text-destructive" : ""}>Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="Enter 10-digit mobile number"
                      className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {phoneError && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-1.5 text-sm text-destructive mt-1">
                        <AlertCircle className="w-4 h-4" /> Enter a valid 10-digit number
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <Label>Location (Optional)</Label>
                    <Input
                      value={selectedLocation}
                      onChange={e => {
                        setSelectedLocation(e.target.value);
                      }}
                      placeholder="Search by location..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Select Hospital</Label>
                    <Select value={selectedHospital} onValueChange={v => { setSelectedHospital(v); setSelectedDepartment(''); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={loading ? "Loading hospitals..." : "Choose hospital"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredHospitals.map(h => <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {hospital && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div className="mb-4 rounded-xl bg-muted p-4">
                        <p className="text-sm font-medium text-foreground">Address</p>
                        <p className="text-sm text-muted-foreground">{hospital.address}</p>
                        <p className="text-sm text-muted-foreground">Location: {hospital.location}</p>
                      </div>
                      <Label>Department</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {hospital.departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </div>

                <Button type="submit" className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold" disabled={!selectedDepartment || !isPhoneValid}>
                  Generate Token <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'booked' && bookedToken && (
            <motion.div key="booked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </motion.div>
                <h1 className="text-3xl font-display font-bold text-foreground">Token Booked!</h1>
                <p className="text-muted-foreground mt-1">Your position has been reserved</p>
              </div>

              <div className="glass-card p-8 text-center space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Your Token Number</p>
                  <div className="token-badge text-4xl mt-2 px-8 py-4">#{bookedToken?.tokenNumber}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-xl p-4">
                    <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">{bookedToken?.estimatedWait || 0} min</p>
                    <p className="text-xs text-muted-foreground">Est. Wait Time</p>
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">{peopleAhead}</p>
                    <p className="text-xs text-muted-foreground">People Ahead</p>
                  </div>
                </div>

                <div className="text-left space-y-2 bg-accent rounded-xl p-4">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Hospital</span><span className="font-medium text-foreground">{bookedToken?.hospital}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Department</span><span className="font-medium text-foreground">{bookedToken?.department}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Patient</span><span className="font-medium text-foreground">{bookedToken?.patientName}</span></div>
                </div>

                <Button onClick={() => setStep('tracking')} className="w-full gradient-primary text-primary-foreground h-12 font-semibold">
                  Track Live Queue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'tracking' && bookedToken && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-foreground">Your Journey</h1>
                <p className="text-muted-foreground mt-1">{bookedToken?.hospital} — {bookedToken?.department}</p>
              </div>

              {/* Live status card */}
              <div className="glass-card p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium text-success">Live Track</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Serving</p>
                    <p className="text-3xl font-bold text-primary font-display">#{currentServing}</p>
                  </div>
                  <div className="scale-110 relative z-10 bg-card rounded-xl p-2 shadow-lg border border-primary/20">
                    <p className="text-sm text-primary font-semibold">Your Token</p>
                    <p className="text-4xl font-bold text-foreground font-display">#{bookedToken?.tokenNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ahead</p>
                    <p className="text-3xl font-bold text-warning font-display">{peopleAhead}</p>
                  </div>
                </div>
              </div>

              {/* Alert if close */}
              {peopleAhead <= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Your turn is approaching!</p>
                    <p className="text-sm text-muted-foreground">Please be ready at the counter</p>
                  </div>
                </motion.div>
              )}

              {/* Explainability Section */}
              <div className="glass-card p-6 mb-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><Info className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold text-foreground">Why am I waiting?</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      There are currently {peopleAhead} tokens ahead of you. Based on an average service time of 8 minutes per patient, your estimated wait is {bookedToken?.estimatedWait || 0} minutes.
                    </p>
                  </div>
                </div>

                {peopleAhead > 0 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-3">Tokens strictly ahead of you:</p>
                    <div className="flex flex-wrap gap-2">
                      {tokensAheadList.map(t => (
                        <span key={t.id} className="inline-flex items-center justify-center bg-muted text-muted-foreground text-sm font-medium px-3 py-1.5 rounded-lg border border-border">
                          #{t.tokenNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Timeline</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-card bg-primary text-primary-foreground font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-accent border border-primary/20">
                      <h4 className="font-bold text-foreground">Token Issued</h4>
                      <p className="text-sm text-muted-foreground">You secured your spot.</p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-card font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${bookedToken?.status === 'serving' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border ${bookedToken?.status === 'serving' ? 'bg-accent border-primary/20' : 'bg-card border-border'}`}>
                      <h4 className={`font-bold ${bookedToken?.status === 'serving' ? 'text-foreground' : 'text-muted-foreground'}`}>At Counter</h4>
                      <p className="text-sm text-muted-foreground">Now serving.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default UserDashboard;
