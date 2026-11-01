import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegisterPopup, setShowRegisterPopup] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ruhuna_current_user');
    if (!saved || saved === 'undefined') return null;
    try { return JSON.parse(saved); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState('login'); // login | register | otp
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // Explore State
  const [activeFaculty, setActiveFaculty] = useState(null);
  const [exploreTab, setExploreTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [likedEvents, setLikedEvents] = useState({});
  const [userRsvpEvents, setUserRsvpEvents] = useState({});
  const [openQaEvent, setOpenQaEvent] = useState(null);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Form State
  const [editingEventId, setEditingEventId] = useState(null);
  const [createdKeyAlert, setCreatedKeyAlert] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', date: '',
    category: 'General', organizer: '', faculty: 'Engineering',
    creatorKey: '', announcement: '', enableCounter: false
  });
  const [submitting, setSubmitting] = useState(false);

  // 🔒 SECURITY GUARD: Fetch events ONLY if a user is logged in
  const loadEvents = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : (data.data || []));
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend server.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentUser]);

  const upcomingEvents = events.filter(e => e.date ? new Date(e.date) >= new Date() : true);

  const allAnnouncements = upcomingEvents.filter(
    e => e.announcement && e.announcement.trim() !== ''
  );

  const topLiked = [...upcomingEvents]
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 3);

  const featuredMap = new Map();
  allAnnouncements.forEach(item => {
    if (item?._id) featuredMap.set(String(item._id), item);
  });
  topLiked.forEach(item => {
    if (item?._id) featuredMap.set(String(item._id), item);
  });

  const featuredBannerItems = Array.from(featuredMap.values());

  useEffect(() => {
    if (featuredBannerItems.length <= 1 || isHovered || activeSection !== 'home') return;

    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % featuredBannerItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredBannerItems.length, isHovered, activeSection]);

  const generateCreatorKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = 'RUH-';
    for (let i = 0; i < 4; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const resetForm = () => {
    setEditingEventId(null);
    setFormData({
      title: '', description: '', location: '', date: '',
      category: 'General', organizer: '', faculty: 'Engineering',
      creatorKey: '', announcement: '', enableCounter: false
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreatedKeyAlert('');

    try {
      const payload = {
        ...formData,
        faculty: formData.faculty,
        creatorKey: editingEventId ? formData.creatorKey : generateCreatorKey(),
      };

      const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (!editingEventId) setCreatedKeyAlert(payload.creatorKey);
        resetForm();
        loadEvents();
        setActiveSection('home');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save event');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== AUTH HANDLERS ==========
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthMessage('OTP sent to your email address!');
        setAuthMode('otp');
      } else {
        setAuthMessage(data.message || 'Failed to send OTP');
      }
    } catch {
      setAuthMessage('Server error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          otp,
          username: authUsername,
          password: authPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('ruhuna_current_user', JSON.stringify(data.user));
        setAuthMode('login');
        setAuthEmail(''); setAuthPassword(''); setAuthUsername(''); setOtp('');
      } else {
        setAuthMessage(data.message || 'Invalid OTP');
      }
    } catch {
      setAuthMessage('Server error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('ruhuna_current_user', JSON.stringify(data.user));
        setAuthEmail(''); setAuthPassword('');
      } else {
        setAuthMessage(data.message || 'Invalid email or password');
      }
    } catch {
      setAuthMessage('Server error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ruhuna_current_user');
    setEvents([]);
  };

  // ========== HELPERS ==========
  const now = new Date();
  const faculties = [
    'Engineering', 'Science', 'Medicine', 'Agriculture',
    'Management & Finance', 'Technology',
    'Humanities & Social Sciences', 'Allied Health Sciences',
    'Fisheries and Marine Sciences & Technology'
  ];
  const categories = ['All', 'Sports', 'Academic', 'Cultural', 'Workshop', 'General'];

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'sports': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'workshop': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'academic': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cultural': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const shareEventOnWhatsApp = (event) => {
    const dateFormatted = event.date ? new Date(event.date).toLocaleString() : 'TBA';
    let message = `*UPCOMING CAMPUS EVENT*\n\n*${event.title.toUpperCase()}*\n` +
      `Faculty: ${event.faculty || 'Engineering'}\n` +
      `Category: ${event.category || 'General'}\n` +
      `Venue: ${event.location}\n` +
      `Date & Time: ${dateFormatted}\n` +
      `Organized By: ${event.organizer || 'Campus Council'}\n\n`;
    if (event.announcement) message += `URGENT NOTICE: ${event.announcement}\n\n`;
    message += `Details: ${event.description}\n\nExplore more on Ruhuna Event Hub!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLikeToggle = async (event) => {
    const isLiked = !!likedEvents[event._id];
    const newLikes = isLiked ? Math.max(0, (event.likes || 0) - 1) : (event.likes || 0) + 1;
    setEvents(prev => prev.map(e => e._id === event._id ? { ...e, likes: newLikes } : e));
    setLikedEvents(prev => ({ ...prev, [event._id]: !isLiked }));
    try {
      await fetch(`/api/events/${event._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes: newLikes })
      });
    } catch {}
  };

  const handleRsvpToggle = async (event) => {
    const isGoing = !!userRsvpEvents[event._id];
    const action = isGoing ? 'dec' : 'inc';
    const newCount = isGoing ? Math.max(0, (event.goingCount || 0) - 1) : (event.goingCount || 0) + 1;

    setEvents(prev => prev.map(e => e._id === event._id ? { ...e, goingCount: newCount } : e));
    setUserRsvpEvents(prev => ({ ...prev, [event._id]: !isGoing }));

    try {
      const res = await fetch(`/api/events/${event._id}/rsvp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const updated = await res.json();
        setEvents(prev => prev.map(e => e._id === event._id ? updated : e));
        if (openQaEvent?._id === event._id) setOpenQaEvent(updated);
      }
    } catch {}
  };

  const handleAddComment = async (event, authorName, text, e) => {
    e.preventDefault();
    if (!text?.trim()) return;
    try {
      const res = await fetch(`/api/events/${event._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: currentUser ? currentUser.username : authorName || 'Student', text })
      });
      if (res.ok) {
        const updated = await res.json();
        setEvents(prev => prev.map(e => e._id === event._id ? updated : e));
        if (openQaEvent?._id === event._id) setOpenQaEvent(updated);
        e.target.reset();
      }
    } catch {}
  };

  // 🔒 MANDATORY AUTH GUARD: Show ONLY the login screen if unauthenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 shadow-2xl">
          <h2 className="text-2xl font-extrabold text-emerald-400 text-center">Ruhuna Event Hub</h2>
          <p className="text-xs text-slate-400 text-center mb-6">Authentication Required to Access Portal</p>

          {authMessage && (
            <p className="text-xs text-center text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              {authMessage}
            </p>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input type="email" placeholder="student@gmail.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition-all">
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-xs text-center text-slate-400 pt-2">
                No account? <button type="button" onClick={() => setAuthMode('register')} className="text-emerald-400 font-semibold underline">Register</button>
              </p>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
                <input type="text" placeholder="John Doe" value={authUsername} onChange={e => setAuthUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input type="email" placeholder="student@gmail.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition-all">
                {authLoading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
              <p className="text-xs text-center text-slate-400 pt-2">
                Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-400 font-semibold underline">Sign In</button>
              </p>
            </form>
          )}

          {authMode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-xs text-slate-400 text-center">Enter the OTP sent to <strong>{authEmail}</strong></p>
              <input type="text" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white text-center tracking-widest font-mono" />
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition-all">
                {authLoading ? 'Verifying...' : 'Verify & Access Hub'}
              </button>
              <button type="button" onClick={() => setAuthMode('register')} className="w-full text-xs text-slate-400 pt-1">← Back to Registration</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 🔓 AUTHENTICATED SYSTEM VIEWS
  if (activeSection === 'home') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        {/* Header */}
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-emerald-400">Ruhuna Event Hub</h1>
            <p className="text-slate-400 text-sm">Campus Portal Gateway</p>
          </div>
          <div>
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
              <span className="text-xs text-emerald-400 font-bold">👤 {currentUser.username}</span>
              <button onClick={handleLogout} className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-colors">Logout</button>
            </div>
          </div>
        </div>

        {/* 3 Main Sections */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <button onClick={() => { resetForm(); setActiveSection('register'); }} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 p-6 rounded-3xl text-left transition-all">
            <div className="text-3xl mb-2">📝</div>
            <h2 className="text-lg font-bold text-white">Event Registration</h2>
            <p className="text-xs text-slate-400 mt-1">Publish events & get Creator Key.</p>
          </button>
          <button onClick={() => { setActiveFaculty(null); setExploreTab('upcoming'); setActiveSection('events'); }} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 p-6 rounded-3xl text-left transition-all">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="text-lg font-bold text-white">Explore Events</h2>
            <p className="text-xs text-slate-400 mt-1">Browse faculty events & notices.</p>
          </button>
          <button onClick={() => setActiveSection('manage')} className="bg-slate-900 border border-slate-800 hover:border-amber-500 p-6 rounded-3xl text-left transition-all">
            <div className="text-3xl mb-2">⚙️</div>
            <h2 className="text-lg font-bold text-white">Manage Events</h2>
            <p className="text-xs text-slate-400 mt-1">Edit or delete listings securely.</p>
          </button>
        </div>

        {/* CALENDAR + BANNER */}
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12 items-start">
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-[440px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📅</span> Event Calendar ({monthNames[month]} {year})
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setCurrentMonthDate(new Date(year, month - 1, 1)); setSelectedCalendarDate(null); }}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-xs font-semibold"
                    >
                      ← Prev
                    </button>
                    <button 
                      onClick={() => { setCurrentMonthDate(new Date(year, month + 1, 1)); setSelectedCalendarDate(null); }}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-xs font-semibold"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10 bg-slate-950/30 rounded-xl"></div>
                  ))}

                  {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const dayEvents = events.filter(e => e.date && e.date.slice(0, 10) === dateStr);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedCalendarDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedCalendarDate(dateStr)}
                        className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                          isSelected 
                            ? 'bg-emerald-500 text-slate-950 font-extrabold' 
                            : hasEvents 
                              ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 font-bold' 
                              : 'bg-slate-950/60 border border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {hasEvents && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-0.5"></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedCalendarDate && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 max-h-28 overflow-y-auto">
                  <span className="text-xs font-bold text-emerald-400">Events on {selectedCalendarDate}:</span>
                  {events.filter(e => e.date && e.date.slice(0, 10) === selectedCalendarDate).map(ev => (
                    <div key={ev._id} className="bg-slate-950 p-2 rounded-xl text-xs">
                      <span className="text-emerald-400 font-bold">{ev.title}</span>
                      <p className="text-[10px] text-slate-400">📍 {ev.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div 
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl h-[440px] flex flex-col"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>📢</span> Featured & Announcements
              </h3>

              {featuredBannerItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs text-center">
                  No announcements yet.<br />Create an event with an urgent notice.
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  {(() => {
                    const item = featuredBannerItems[bannerIndex] || featuredBannerItems[0];
                    return (
                      <div className="space-y-3">
                        {item.announcement && (
                          <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 p-3 rounded-2xl text-xs font-semibold animate-pulse">
                            ⚠️ {item.announcement}
                          </div>
                        )}
                        <h4 className="text-base font-bold text-white leading-snug">{item.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-3">{item.description}</p>
                        <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                          <p>📍 {item.location}</p>
                          <p>🏫 {item.faculty}</p>
                          <p>📅 {item.date ? new Date(item.date).toLocaleDateString() : 'TBA'}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-center gap-1.5 mt-4">
                    {featuredBannerItems.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setBannerIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === bannerIndex ? 'bg-emerald-400 w-4' : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Register Popup */}
        {showRegisterPopup && (
          <div className="fixed bottom-6 right-6 z-40 max-w-xs w-full">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl relative">
              <button
                onClick={() => setShowRegisterPopup(false)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>

              <div className="flex items-start gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Have an Event?</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Publish your campus event in less than a minute and get a Creator Key.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveSection('register');
                      setShowRegisterPopup(false);
                    }}
                    className="mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                  >
                    Register Event →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // REGISTER FORM
  if (activeSection === 'register') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{editingEventId ? 'Edit Event' : 'Register New Event'}</h2>
            <button onClick={() => setActiveSection('home')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg">Back</button>
          </div>

          {createdKeyAlert && (
            <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 p-3 rounded-xl mb-4 text-xs">
              🔑 Save Your Creator Key: <strong className="font-mono bg-slate-950 px-2 py-0.5 rounded">{createdKeyAlert}</strong>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} required rows="3" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Time</label>
                <input type="datetime-local" name="date" value={formData.date} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                  {['General','Sports','Academic','Cultural','Workshop'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Faculty / Campus Area</label>
                <select name="faculty" value={formData.faculty} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                  {faculties.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Organizer</label>
              <input type="text" name="organizer" value={formData.organizer} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Urgent Announcement (optional)</label>
              <input type="text" name="announcement" value={formData.announcement} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="enableCounter" checked={formData.enableCounter} onChange={handleInputChange} id="counter" />
              <label htmlFor="counter" className="text-xs text-slate-300">Enable Going Counter</label>
            </div>
            {editingEventId && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Creator Key</label>
                <input type="text" name="creatorKey" value={formData.creatorKey} onChange={handleInputChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            )}
            <button type="submit" disabled={submitting} className="w-full bg-emerald-500 font-bold text-slate-950 py-3 rounded-xl text-xs">
              {submitting ? 'Saving...' : editingEventId ? 'Update Event' : 'Submit Event'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MANAGE SECTION
  if (activeSection === 'manage') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <h2 className="text-xl font-bold text-amber-400">Manage Events</h2>
            <button onClick={() => setActiveSection('home')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg">Back</button>
          </div>
          {events.length === 0 ? (
            <p className="text-slate-400 text-sm">No events yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event._id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">{event.title}</h3>
                    <p className="text-xs text-slate-400">📍 {event.location} | 🏫 {event.faculty}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const key = prompt('Enter Creator Key to edit:');
                        if (key === event.creatorKey) {
                          setEditingEventId(event._id);
                          setFormData({
                            title: event.title || '',
                            description: event.description || '',
                            location: event.location || '',
                            date: event.date ? event.date.slice(0, 16) : '',
                            category: event.category || 'General',
                            organizer: event.organizer || '',
                            faculty: event.faculty || 'Engineering',
                            creatorKey: key,
                            announcement: event.announcement || '',
                            enableCounter: event.enableCounter || false
                          });
                          setActiveSection('register');
                        } else if (key) alert('Invalid Key');
                      }}
                      className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        const key = prompt('Enter Creator Key to delete:');
                        if (key === event.creatorKey) {
                          if (confirm(`Delete "${event.title}"?`)) {
                            await fetch(`/api/events/${event._id}`, { method: 'DELETE' });
                            loadEvents();
                          }
                        } else if (key) alert('Invalid Key');
                      }}
                      className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // EXPLORE - FACULTY SELECTION
  if (activeSection === 'events' && !activeFaculty) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white">Choose Faculty</h2>
            <button onClick={() => setActiveSection('home')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg">Back</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => setActiveFaculty('ALL')} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 p-5 rounded-2xl text-left">
              <h3 className="font-bold text-emerald-400">All Faculties</h3>
              <p className="text-xs text-slate-400 mt-1">View everything</p>
            </button>
            {faculties.map(f => (
              <button key={f} onClick={() => setActiveFaculty(f)} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 p-5 rounded-2xl text-left">
                <h3 className="font-bold text-white">{f}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // EXPLORE - EVENTS LIST
  const facultyEvents = events.filter(e => {
    const area = e.faculty || 'Engineering';
    const isSameFaculty = activeFaculty === 'ALL' || area.toLowerCase() === activeFaculty.toLowerCase();
    const eventDate = e.date ? new Date(e.date) : null;
    const isUpcoming = exploreTab === 'upcoming' ? (!eventDate || eventDate >= now) : (eventDate && eventDate < now);
    const matchesSearch = !searchQuery || e.title?.toLowerCase().includes(searchQuery.toLowerCase()) || e.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (e.category && e.category.toLowerCase() === selectedCategory.toLowerCase());
    return isSameFaculty && isUpcoming && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
          <button onClick={() => setActiveFaculty(null)} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg">← Back</button>
          <span className="text-emerald-400 font-bold text-sm">{activeFaculty === 'ALL' ? 'All Faculties' : `Faculty of ${activeFaculty}`}</span>
          <div className="flex gap-2">
            <button onClick={() => setExploreTab('upcoming')} className={`text-xs px-3 py-1 rounded-lg ${exploreTab === 'upcoming' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>Upcoming</button>
            <button onClick={() => setExploreTab('past')} className={`text-xs px-3 py-1 rounded-lg ${exploreTab === 'past' ? 'bg-rose-500 text-white' : 'bg-slate-800'}`}>Past</button>
          </div>
        </div>

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" placeholder="🔍 Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" />
          <div className="flex gap-1.5 overflow-x-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${selectedCategory === cat ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {facultyEvents.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">No events found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {facultyEvents.map(event => (
              <div key={event._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{event.faculty}</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryColor(event.category)}`}>{event.category || 'General'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOpenQaEvent(event)} className="bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full text-xs">💬 {event.comments?.length || 0}</button>
                    <button onClick={() => shareEventOnWhatsApp(event)} className="bg-emerald-600/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs">WhatsApp</button>
                    <button onClick={() => handleLikeToggle(event)} className={`px-2.5 py-1 rounded-full text-xs border ${likedEvents[event._id] ? 'bg-amber-400/10 border-amber-400/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      👍 {event.likes || 0}
                    </button>
                  </div>
                </div>

                {event.announcement && (
                  <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 p-2.5 rounded-xl text-xs mb-3">
                    ⚠️ <strong>Notice:</strong> {event.announcement}
                  </div>
                )}

                <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                <p className="text-slate-300 text-sm mb-4 whitespace-pre-line">{event.description}</p>

                {event.enableCounter && (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance</span>
                    <button 
                      onClick={() => handleRsvpToggle(event)} 
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        userRsvpEvents[event._id] 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      👍 {userRsvpEvents[event._id] ? 'Going ✓' : 'Going'} ({event.goingCount || 0})
                    </button>
                  </div>
                )}

                <div className="text-xs text-slate-400 space-y-1 border-t border-slate-800 pt-3">
                  <p>📍 {event.location}</p>
                  <p>👤 {event.organizer || 'Campus Council'}</p>
                  <p>📅 {event.date ? new Date(event.date).toLocaleString() : 'TBA'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Q&A Drawer */}
      {openQaEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Q&A</h3>
                <p className="text-xs text-emerald-400">{openQaEvent.title}</p>
              </div>
              <button onClick={() => setOpenQaEvent(null)} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs">✕</button>
            </div>

            <form onSubmit={(e) => {
              const fd = new FormData(e.target);
              handleAddComment(openQaEvent, fd.get('authorName'), fd.get('commentText'), e);
            }} className="space-y-2 mb-4">
              <input name="authorName" placeholder="Your Name (optional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white" />
              <div className="flex gap-2">
                <input name="commentText" placeholder="Ask a question..." required className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white" />
                <button type="submit" className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs">Ask</button>
              </div>
            </form>

            <div className="space-y-2 overflow-y-auto flex-1">
              {openQaEvent.comments?.length > 0 ? openQaEvent.comments.map((c, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-emerald-400">{c.authorName}</span>
                    <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-500 text-center py-8">No questions yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}