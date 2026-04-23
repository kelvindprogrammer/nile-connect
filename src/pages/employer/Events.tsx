import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle2, Clock } from 'lucide-react';

type Tab = 'posted' | 'awaiting' | 'upcoming';

const postedEvents = [
    { id: 1, title: 'TECH TALK: FUTURE OF AI', date: 'OCT 20, 2026', capacity: 100, registrations: 85, attendance: 0 },
    { id: 2, title: 'RESUME REVIEW WORKSHOP', date: 'NOV 05, 2026', capacity: 50, registrations: 50, attendance: 0 },
];

const upcomingEvents = [
    { id: 3, title: 'SPRING CAREER FAIR', date: 'APR 25, 2026', location: 'Main Hall', registrations: 320 },
    { id: 4, title: 'NETWORKING NIGHT', date: 'MAY 02, 2026', location: 'Business School', registrations: 140 },
];

const emptyForm = { title: '', date: '', capacity: '', location: '', description: '' };

const EmployerEvents = () => {
    const [tab, setTab] = useState<Tab>('posted');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitted, setSubmitted] = useState(false);
    const [awaitingList, setAwaitingList] = useState<typeof postedEvents>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            setAwaitingList((prev) => [...prev, { id: Date.now(), title: form.title.toUpperCase(), date: form.date, capacity: Number(form.capacity), registrations: 0, attendance: 0 }]);
            setSubmitted(false);
            setShowForm(false);
            setForm(emptyForm);
            setTab('awaiting');
        }, 1200);
    };

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'posted', label: 'Posted Events', icon: <CheckCircle2 size={13} /> },
        { key: 'awaiting', label: 'Awaiting Verification', icon: <Clock size={13} /> },
        { key: 'upcoming', label: 'Upcoming Events (Campus)', icon: <Calendar size={13} /> },
    ];

    return (
        <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            <h1 style={pageTitle}>COMPANY EVENTS</h1>
            <p style={pageSubtitle}>HOST & ATTEND STUDENT EVENTS</p>
            <hr style={pageDivider} />

            {/* Tabs */}
            <div style={{ display: 'flex' }}>
                {tabs.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '10px 20px',
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 11, fontWeight: tab === key ? 800 : 600, letterSpacing: 1,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: tab === key ? '#111' : '#888',
                            borderBottom: tab === key ? '2px solid #111' : '2px solid transparent',
                        }}
                    >
                        {icon} {label}
                    </button>
                ))}
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '0 0 24px 0' }} />

            {/* POSTED EVENTS */}
            {tab === 'posted' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <button style={btnOutline} onClick={() => setShowForm(true)}>
                            <Plus size={14} /> POST NEW EVENT
                        </button>
                    </div>

                    {showForm && (
                        <div style={{ ...card, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, margin: '0 0 16px 0' }}>NEW EVENT</h3>
                            {submitted ? (
                                <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: 2, padding: 20 }}>✓ SUBMITTED FOR VERIFICATION</p>
                            ) : (
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', gap: 14 }}>
                                        <div style={formGroup}>
                                            <label style={formLabel}>EVENT TITLE</label>
                                            <input name="title" value={form.title} onChange={handleChange} style={formInput} placeholder="Tech Talk: AI" required />
                                        </div>
                                        <div style={formGroup}>
                                            <label style={formLabel}>DATE</label>
                                            <input type="date" name="date" value={form.date} onChange={handleChange} style={formInput} required />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 14 }}>
                                        <div style={formGroup}>
                                            <label style={formLabel}>LOCATION</label>
                                            <input name="location" value={form.location} onChange={handleChange} style={formInput} placeholder="Room / Building" required />
                                        </div>
                                        <div style={formGroup}>
                                            <label style={formLabel}>CAPACITY</label>
                                            <input type="number" name="capacity" value={form.capacity} onChange={handleChange} style={formInput} placeholder="100" required />
                                        </div>
                                    </div>
                                    <div style={formGroup}>
                                        <label style={formLabel}>DESCRIPTION</label>
                                        <textarea name="description" value={form.description} onChange={handleChange} style={{ ...formInput, minHeight: 80, resize: 'vertical' }} placeholder="About this event..." />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                        <button type="button" style={btnOutline} onClick={() => setShowForm(false)}>CANCEL</button>
                                        <button type="submit" style={btnPrimary}>SUBMIT EVENT</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {postedEvents.map((event) => (
                            <div key={event.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, margin: 0 }}>{event.title}</h3>
                                    <div style={{ width: 36, height: 36, border: '2px solid #111', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Calendar size={18} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { label: 'DATE', val: event.date },
                                        { label: 'CAPACITY', val: event.capacity },
                                        { label: 'REGISTRATIONS', val: event.registrations },
                                        { label: 'ATTENDANCE', val: event.attendance },
                                    ].map(({ label, val }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ddd', paddingBottom: 8 }}>
                                            <span style={{ fontSize: 10, letterSpacing: 1.5, color: '#888' }}>{label}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>MANAGE</button>
                                    <button style={{ ...btnOutline, flex: 1, justifyContent: 'center' }}>DETAILS</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AWAITING */}
            {tab === 'awaiting' && (
                awaitingList.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: 60, color: '#888' }}>
                        <Clock size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
                        <p style={{ fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>NO EVENTS AWAITING VERIFICATION</p>
                        <p style={{ fontSize: 10, color: '#bbb', letterSpacing: 1 }}>SUBMITTED EVENTS WILL APPEAR HERE</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {awaitingList.map((event) => (
                            <div key={event.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, margin: 0 }}>{event.title}</h3>
                                <span style={{ display: 'inline-block', background: '#f0f0f0', color: '#888', border: '1px solid #ccc', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 1, width: 'fit-content' }}>
                                    AWAITING APPROVAL
                                </span>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* UPCOMING */}
            {tab === 'upcoming' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {upcomingEvents.map((event) => (
                        <div key={event.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, margin: 0 }}>{event.title}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    { label: 'DATE', val: event.date },
                                    { label: 'LOCATION', val: event.location },
                                    { label: 'REGISTERED', val: event.registrations },
                                ].map(({ label, val }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ddd', paddingBottom: 8 }}>
                                        <span style={{ fontSize: 10, letterSpacing: 1.5, color: '#888' }}>{label}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{val}</span>
                                    </div>
                                ))}
                            </div>
                            <button style={{ ...btnOutline, width: '100%', justifyContent: 'center' }}>VIEW DETAILS</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const pageTitle: React.CSSProperties = { fontSize: 34, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: '#111', margin: '0 0 4px 0' };
const pageSubtitle: React.CSSProperties = { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#888', margin: 0 };
const pageDivider: React.CSSProperties = { border: 'none', borderTop: '2px solid #111', margin: '16px 0 0 0' };
const card: React.CSSProperties = { background: '#fff', border: '2px solid #111', borderRadius: 12, padding: 20 };
const formGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, flex: 1 };
const formLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#555', textTransform: 'uppercase' };
const formInput: React.CSSProperties = { border: '2px solid #ddd', borderRadius: 8, padding: '10px 14px', fontFamily: "'Courier New', Courier, monospace", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { background: '#111', color: '#fff', border: '2px solid #111', padding: '10px 16px', fontFamily: "'Courier New', Courier, monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnOutline: React.CSSProperties = { background: '#fff', color: '#111', border: '2px solid #111', padding: '10px 16px', fontFamily: "'Courier New', Courier, monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 };

export default EmployerEvents;
