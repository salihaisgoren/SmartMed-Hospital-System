import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { FaUserInjured, FaSignOutAlt, FaBan, FaCalendarAlt, FaClock, FaUnlock, FaSearch } from 'react-icons/fa';

import logo from '../assets/hastane-logo.png';
import kalpIkon from '../assets/kalp-ikon.png';
import stetoskopIkon from '../assets/stetoskop-ikon.png';

import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const generateHospitalTimeSlots = () => {
    const slots = [];
    for (let h = 9; h <= 11; h++) {
        for (let m = 0; m < 60; m += 15) {
            if (h === 11 && m > 45) continue;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    for (let h = 13; h <= 16; h++) {
        for (let m = 0; m < 60; m += 15) {
            if (h === 16 && m > 45) continue;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    return slots;
};

const DoktorPanel = ({ onLogout }) => {
    const [doktorAdi] = useState(() => {
        const userInfo = localStorage.getItem("user_info");
        return userInfo ? JSON.parse(userInfo).fullName : "Doktor";
    });

    const [stats, setStats] = useState({ total: 0, waiting: 0, completed: 0 });
    const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0]);
    const [appointments, setAppointments] = useState([]); // Yeni: Gerçek randevular için state
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [blockDate, setBlockDate] = useState("");
    const [blockStartTime, setBlockStartTime] = useState("");
    const [blockEndTime, setBlockEndTime] = useState("");

    const timeSlots = generateHospitalTimeSlots();

    useEffect(() => {
        const fetchData = async () => {
            const userInfo = localStorage.getItem("user_info");
            const token = userInfo ? JSON.parse(userInfo).token : null;

            if (!token) return;

            try {
                // 1. İstatistikleri çek
                const responseStats = await fetch("https://localhost:7092/api/Appointments/stats", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (responseStats.ok) {
                    const data = await responseStats.json();
                    setStats({ total: data.total, waiting: data.waiting, completed: data.completed });
                }

                // 2. Haftalık grafiği çek
                const responseWeekly = await fetch("https://localhost:7092/api/Appointments/weekly-stats", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (responseWeekly.ok) {
                    const data = await responseWeekly.json();
                    setWeeklyData(data);
                }

                // 3. YENİ: Günlük gerçek hasta listesini çek
                const responseDaily = await fetch("https://localhost:7092/api/Appointments/daily-appointments", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (responseDaily.ok) {
                    const data = await responseDaily.json();
                    setAppointments(data);
                }

            } catch (error) { console.error("Veri çekme hatası:", error); }
        };

        fetchData();
    }, [refreshTrigger]);

    const handleMuayeneEt = async (randevuId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem("user_info"));
            const response = await fetch(`https://localhost:7092/api/Appointments/${randevuId}/complete`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${userInfo.token}`
                }
            });

            if (response.ok) {
                alert("Muayene tamamlandı!");
                setRefreshTrigger(prev => prev + 1); // Tabloyu anında yeniler
            }
        } catch (error) {
            console.error("Hata:", error);
        }
    };

    const handleTimeBlock = async () => {
        if (!blockDate || !blockStartTime || !blockEndTime) {
            alert("Lütfen tarih, başlangıç ve bitiş saatlerini eksiksiz seçiniz.");
            return;
        }
        if (blockStartTime >= blockEndTime) {
            alert("Bitiş saati, başlangıç saatinden daha ileri bir saat olmalıdır!");
            return;
        }
        if (!window.confirm(`${blockDate} tarihinde ${blockStartTime} - ${blockEndTime} arasını randevuya kapatmak istediğinize emin misiniz?`)) {
            return;
        }
        const userInfoStr = localStorage.getItem("user_info");
        if (!userInfoStr) return;
        const userInfo = JSON.parse(userInfoStr);
        const token = userInfo.token;
        const doctorId = userInfo.userId || userInfo.id;

        try {
            const response = await fetch(`https://localhost:7092/api/Doctors/block-schedule/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ date: blockDate, startTime: blockStartTime, endTime: blockEndTime })
            });
            if (response.ok) {
                const result = await response.json();
                alert(result.message || "Seçilen zaman dilimi randevulara kapatıldı.");
                setBlockDate(""); setBlockStartTime(""); setBlockEndTime("");
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (error) { console.error("Hata:", error); }
    };

    const handleTimeUnblock = async () => {
        if (!blockDate || !blockStartTime || !blockEndTime) {
            alert("Lütfen geri açmak istediğiniz tarih, başlangıç ve bitiş saatlerini eksiksiz seçiniz.");
            return;
        }
        if (blockStartTime >= blockEndTime) {
            alert("Bitiş saati, başlangıç saatinden daha ileri bir saat olmalıdır!");
            return;
        }
        const userInfoStr = localStorage.getItem("user_info");
        if (!userInfoStr) return;
        const userInfo = JSON.parse(userInfoStr);
        const token = userInfo.token;
        const doctorId = userInfo.userId || userInfo.id;

        try {
            const response = await fetch(`https://localhost:7092/api/Doctors/unblock-schedule/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ date: blockDate, startTime: blockStartTime, endTime: blockEndTime })
            });
            if (response.ok) {
                const result = await response.json();
                alert(result.message || "Seçilen zaman dilimi başarıyla tekrar randevuya açıldı.");
                setBlockDate(""); setBlockStartTime(""); setBlockEndTime("");
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (error) { console.error("Hata:", error); }
    };

    const grafikVerisi = {
        labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
        datasets: [{ label: 'Hasta Sayısı', data: weeklyData, backgroundColor: '#0097A7', borderRadius: 4 }],
    };

    const grafikAyarlari = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
            x: { grid: { display: false } }
        }
    };

    return (
        <div className="admin-container">
            <div className="sidebar" style={{backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'}}>
                <div style={{padding: '40px 20px 20px 20px', textAlign: 'center'}}>
                    <img src={logo} alt="Hastane Logo" style={{width: '120px', height: 'auto', objectFit: 'contain'}} />
                </div>
                <ul style={{marginTop: '30px', flex: 1, padding: '0 15px'}}>
                    <li className="active" style={{backgroundColor: '#0097A7', color: 'white', borderRadius: '8px', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', boxShadow: '0 4px 6px rgba(0, 151, 167, 0.2)'}}>
                        <FaUserInjured size={18} /> Randevularım
                    </li>
                </ul>
                <div style={{padding: '20px 15px 60px 15px', borderTop: '1px solid #f1f5f9'}}>
                    <div style={{textAlign: 'center', marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
                        <img src={kalpIkon} alt="Kalp" style={{width: '28px'}} />
                        <p style={{margin: '0', fontSize: '0.9rem', color: '#334155', fontWeight: '700'}}>Doktor Paneli</p>
                    </div>
                    <button onClick={onLogout} className="logout-btn" style={{width: '100%', backgroundColor: '#fef2f2', color: '#d32f2f', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                        <FaSignOutAlt /> Çıkış Yap
                    </button>
                </div>
            </div>

            <div className="main-content" style={{backgroundColor: '#ffffff', padding: '40px'}}>
                <div className="header" style={{marginBottom: '40px'}}>
                    <h1 style={{color: '#0f172a', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', margin: '0'}}>
                        Merhaba, {doktorAdi}
                        <img src={stetoskopIkon} alt="Stetoskop" style={{width: '60px', transform: 'translateY(-4px)'}} />
                    </h1>
                </div>

                <div className="stats-grid" style={{gap: '25px', marginBottom: '40px'}}>
                    <div className="stat-card" style={{borderTop: '4px solid #0097A7'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem'}}>Bugünkü Randevular</h3>
                        <p style={{color: '#0097A7', fontSize: '2.5rem', fontWeight: 'bold'}}>{stats.total}</p>
                    </div>
                    <div className="stat-card" style={{borderTop: '4px solid #f59e0b'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem'}}>Bekleyen</h3>
                        <p style={{color: '#f59e0b', fontSize: '2.5rem', fontWeight: 'bold'}}>{stats.waiting}</p>
                    </div>
                    <div className="stat-card" style={{borderTop: '4px solid #10b981'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem'}}>Tamamlanan</h3>
                        <p style={{color: '#10b981', fontSize: '2.5rem', fontWeight: 'bold'}}>{stats.completed}</p>
                    </div>
                </div>

                <div style={{display:'flex', gap:'25px', flexWrap:'wrap'}}>
                    <div className="form-card" style={{flex: 2, minWidth: '300px'}}>
                        <h3 style={{color: '#334155', fontSize: '1.2rem', marginBottom: '25px'}}>Haftalık Yoğunluk</h3>
                        <Bar options={grafikAyarlari} data={grafikVerisi} height={90} />
                    </div>

                    <div className="form-card" style={{flex: 1, minWidth: '320px'}}>
                        <h3 style={{color: '#0097A7', fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <FaCalendarAlt /> Müsaitlik Yönetimi
                        </h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
                            <input type="date" value={blockDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setBlockDate(e.target.value)} style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1'}} />
                            <div style={{display: 'flex', gap: '10px'}}>
                                <select value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}>
                                    <option value="">Başlangıç</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}>
                                    <option value="">Bitiş</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                            <button onClick={handleTimeBlock} className="block-btn" style={{flex: 1, padding: '14px', color: 'white', backgroundColor: '#d32f2f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><FaBan /> Kapat</button>
                            <button onClick={handleTimeUnblock} className="unblock-btn" style={{flex: 1, padding: '14px', color: 'white', backgroundColor: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><FaUnlock /> Geri Aç</button>
                        </div>
                    </div>

                    {/* 📋 GÜNLÜK HASTA LİSTESİ TABLOSU */}
                    <div className="form-card" style={{ width: '100%', marginTop: '10px', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '30px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h3 style={{ color: '#334155', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <FaUserInjured style={{ color: '#0097A7' }} /> Bugünkü Hasta Akışı
                            </h3>
                            <div style={{ position: 'relative' }}>
                                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="text" placeholder="Hasta ara..." style={{ padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '15px' }}>SAAT</th>
                                    <th style={{ padding: '15px' }}>HASTA BİLGİSİ</th>
                                    <th style={{ padding: '15px' }}>AI ŞİKAYET ANALİZİ</th>
                                    <th style={{ padding: '15px' }}>DURUM</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>İŞLEM</th>
                                </tr>
                                </thead>
                                <tbody>
                                {appointments.length > 0 ? (
                                    appointments.map((app) => (
                                        <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{ backgroundColor: '#f0fdfa', color: '#0f766e', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                                                    {app.appointmentTime}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{app.patientName}</div>
                                            </td>
                                            <td style={{ padding: '15px', maxWidth: '400px' }}>
                                                {app.aiSummary ? (
                                                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4', backgroundColor: '#f0fdfa', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #0097A7' }}>
                                                        <strong>AI Analizi:</strong> {app.aiSummary}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                                        {app.manualComplaint}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{
                                                    backgroundColor: app.status === 'Bekliyor' ? '#fff7ed' : '#f0fdf4',
                                                    color: app.status === 'Bekliyor' ? '#c2410c' : '#166534',
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold'
                                                }}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleMuayeneEt(app.id)}
                                                    style={{ backgroundColor: '#0097A7', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                                                >
                                                    Muayene Et
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                            Bugün için henüz randevu bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoktorPanel;