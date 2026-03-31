import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, LogOut, Users, Ticket, Clock, SkipForward, AlertTriangle, ChevronRight, TrendingUp, BarChart3, Stethoscope, RefreshCcw, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['hsl(199, 89%, 48%)', 'hsl(172, 66%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(270, 50%, 60%)'];

const AdminDashboard = () => {
  const { user, tokens, hospitals, loading, refreshAdminTokens, callNextToken, skipToken, setPriorityToken, delayToken, sendUserAlert, logout } = useApp();
  const navigate = useNavigate();
  const [filterHospital, setFilterHospital] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Set initial filter when hospitals load
  useEffect(() => {
    if (hospitals.length > 0 && !filterHospital) {
      setFilterHospital(hospitals[0].name);
    }
  }, [hospitals, filterHospital]);

  // Real-time synchronization
  useEffect(() => {
    if (!filterHospital) return;
    
    const triggerRefresh = () => refreshAdminTokens(filterHospital, filterDept);
    
    triggerRefresh();
    const interval = setInterval(triggerRefresh, 5000);
    return () => clearInterval(interval);
  }, [filterHospital, filterDept, refreshAdminTokens]);

  const hospital = hospitals.find(h => h.name === filterHospital);

  const filteredTokens = useMemo(() =>
    tokens.filter(t => t.hospital === filterHospital && (!filterDept || filterDept === '__all' || t.department === filterDept)),
    [tokens, filterHospital, filterDept]
  );

  const stats = useMemo(() => ({
    total: filteredTokens.length,
    waiting: filteredTokens.filter(t => t.status === 'waiting').length,
    serving: filteredTokens.filter(t => t.status === 'serving').length,
    completed: filteredTokens.filter(t => t.status === 'completed').length,
    avgWait: Math.round(filteredTokens.filter(t => t.status === 'waiting').reduce((a, t) => a + t.estimatedWait, 0) / (filteredTokens.filter(t => t.status === 'waiting').length || 1)),
  }), [filteredTokens]);

  const deptData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTokens.forEach(t => { map[t.department] = (map[t.department] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTokens]);

  const statusData = useMemo(() => [
    { name: 'Waiting', value: stats.waiting },
    { name: 'Serving', value: stats.serving },
    { name: 'Completed', value: stats.completed },
  ], [stats]);

  const handleLogout = () => { logout(); navigate('/'); };

  const statCards = [
    { label: 'Total Tokens', value: stats.total, icon: Ticket, color: 'text-primary' },
    { label: 'Waiting', value: stats.waiting, icon: Users, color: 'text-warning' },
    { label: 'Now Serving', value: stats.serving, icon: Stethoscope, color: 'text-success' },
    { label: 'Avg Wait', value: `${stats.avgWait}m`, icon: Clock, color: 'text-info' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
              <img src="/logo.png" alt="MediQueue" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">MediQueue Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {loading && hospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCcw className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground animate-pulse">Initializing clinical data...</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-end gap-4 mb-8">
              <div className="space-y-1.5 flex-1 max-w-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase ml-1">Hospital</p>
                <Select value={filterHospital} onValueChange={v => { setFilterHospital(v); setFilterDept(''); }}>
                  <SelectTrigger className="w-full bg-card border-border/50 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              {hospital && (
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase ml-1">Department</p>
                  <Select value={filterDept} onValueChange={setFilterDept}>
                    <SelectTrigger className="w-full bg-card border-border/50 h-11"><SelectValue placeholder="All departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">All departments</SelectItem>
                      {hospital.departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-success bg-success/5 px-3 py-1.5 rounded-full border border-success/10">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live Sync Active
              </div>
            </div>

            {filteredTokens.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Inbox className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-2">No Active Tokens</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  There are currently no patients in the queue for the selected filters. 
                  Synchronizing with live database...
                </p>
              </motion.div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {statCards.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-foreground font-display">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="glass-card p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Tokens by Department</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={deptData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 90%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(210, 15%, 50%)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(210, 15%, 50%)' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(199, 89%, 48%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-primary" /> Queue Status</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                          {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {statusData.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                          {s.name} ({s.value})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Queue Management */}
                <div className="glass-card p-6 border-t-4 border-primary/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" /> Real-Time Queue Control
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      Last Updated: {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
                          <th className="pb-3 font-medium">Token</th>
                          <th className="pb-3 font-medium">Patient</th>
                          <th className="pb-3 font-medium hidden sm:table-cell">Department</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filteredTokens.map(t => (
                            <motion.tr 
                              key={t.id} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              layout
                              className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-4">
                                <span className={`inline-flex items-center justify-center w-11 h-8 rounded-lg text-sm font-bold ${t.priority ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'} border ${t.priority ? 'border-destructive/20' : 'border-primary/20'}`}>
                                  #{t.tokenNumber}
                                </span>
                              </td>
                              <td className="py-4">
                                <p className="font-semibold text-foreground text-sm">{t.patientName}</p>
                                <p className="text-xs text-muted-foreground">{t.phone}</p>
                                {t.alertMessage && (
                                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-warning mt-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t.alertType === 'delay' ? 'Delayed' : 'Notified'}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 text-sm text-muted-foreground hidden sm:table-cell">{t.department}</td>
                              <td className="py-4">
                                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border ${
                                  t.status === 'serving' ? 'bg-success/5 text-success border-success/20' :
                                  t.status === 'waiting' ? 'bg-warning/5 text-warning border-warning/20' :
                                  t.status === 'completed' ? 'bg-muted text-muted-foreground border-border/50' :
                                  'bg-destructive/5 text-destructive border-destructive/20'
                                }`}>{t.status}</span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {t.status === 'serving' && (
                                    <Button size="sm" onClick={() => callNextToken(t.hospital, t.department)} className="gradient-primary text-primary-foreground text-xs h-8 shadow-sm">
                                      Next Patient <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                  )}
                                  {(t.status === 'waiting' || t.status === 'serving') && (
                                    <>
                                      {t.status === 'waiting' && (
                                        <Button size="sm" variant="outline" onClick={() => skipToken(t.id)} className="text-xs h-8 px-2 border-border/50 hover:bg-muted">
                                          <SkipForward className="w-4 h-4" />
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline" onClick={() => sendUserAlert(t.id, 'Your time is approaching. Please start your journey soon.')} className="text-xs h-8 px-2 border-border/50 text-sky-600 hover:bg-sky-50">
                                        Alert
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => delayToken(t.id, 5)} className="text-xs h-8 px-2 border-border/50 text-warning hover:bg-warning/5">
                                        Delay 5m
                                      </Button>
                                      {t.status === 'waiting' && !t.priority && (
                                        <Button size="sm" variant="outline" onClick={() => setPriorityToken(t.id)} className="text-xs h-8 px-2 border-border/50 text-destructive hover:bg-destructive/5">
                                          <AlertTriangle className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
