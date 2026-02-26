import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { FaUserInjured, FaSignOutAlt, FaBan, FaCalendarAlt, FaClock, FaUnlock } from 'react-icons/fa'; // FaUnlock eklendi

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
                const responseStats = await fetch("https://localhost:7092/api/Appointments/stats", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (responseStats.ok) {
                    const data = await responseStats.json();
                    setStats({ total: data.total, waiting: data.waiting, completed: data.completed });
                }

                const responseWeekly = await fetch("https://localhost:7092/api/Appointments/weekly-stats", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (responseWeekly.ok) {
                    const data = await responseWeekly.json();
                    setWeeklyData(data);
                }
            } catch (error) { console.error("Veri çekme hatası:", error); }
        };

        fetchData();
    }, [refreshTrigger]);

    // 🔴 KAPATMA FONKSİYONU
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
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: blockDate,
                    startTime: blockStartTime,
                    endTime: blockEndTime
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || "Seçilen zaman dilimi randevulara kapatıldı.");
                setBlockDate("");
                setBlockStartTime("");
                setBlockEndTime("");
                setRefreshTrigger(prev => prev + 1);
            } else {
                const errorText = await response.text();
                alert("İşlem başarısız: " + errorText);
            }
        } catch (error) {
            console.error("Hata:", error);
            alert("Sunucuya bağlanılamadı.");
        }
    };

    // 🟢 YENİ: GERİ AÇMA FONKSİYONU
    const handleTimeUnblock = async () => {
        if (!blockDate || !blockStartTime || !blockEndTime) {
            alert("Lütfen geri açmak istediğiniz tarih, başlangıç ve bitiş saatlerini eksiksiz seçiniz.");
            return;
        }

        if (blockStartTime >= blockEndTime) {
            alert("Bitiş saati, başlangıç saatinden daha ileri bir saat olmalıdır!");
            return;
        }

        if (!window.confirm(`${blockDate} tarihinde ${blockStartTime} - ${blockEndTime} arasındaki kilitleri kaldırıp randevuya açmak istediğinize emin misiniz?`)) {
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
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: blockDate,
                    startTime: blockStartTime,
                    endTime: blockEndTime
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || "Seçilen zaman dilimi başarıyla tekrar randevuya açıldı.");
                setBlockDate("");
                setBlockStartTime("");
                setBlockEndTime("");
                setRefreshTrigger(prev => prev + 1);
            } else {
                const errorText = await response.text();
                alert("İşlem başarısız: " + errorText);
            }
        } catch (error) {
            console.error("Hata:", error);
            alert("Sunucuya bağlanılamadı.");
        }
    };

    const grafikVerisi = {
        labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
        datasets: [
            {
                label: 'Hasta Sayısı',
                data: weeklyData,
                backgroundColor: '#0097A7',
                borderRadius: 4,
            },
        ],
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
            {/* Sol Menü */}
            <div className="sidebar" style={{backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'}}>

                <div style={{padding: '40px 20px 20px 20px', textAlign: 'center'}}>
                    <img
                        src={logo}
                        alt="Hastane Logo"
                        style={{width: '120px', height: 'auto', objectFit: 'contain'}}
                    />
                </div>

                <ul style={{marginTop: '30px', flex: 1, padding: '0 15px'}}>
                    <li className="active" style={{backgroundColor: '#0097A7', color: 'white', borderRadius: '8px', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', boxShadow: '0 4px 6px rgba(0, 151, 167, 0.2)'}}>
                        <FaUserInjured size={18} /> Randevularım
                    </li>
                </ul>

                <div style={{padding: '20px 15px 60px 15px', borderTop: '1px solid #f1f5f9'}}>
                    <div style={{textAlign: 'center', marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
                        <img src={kalpIkon} alt="Kalp" style={{width: '28px', height: 'auto', opacity: '0.9'}} />
                        <p style={{margin: '0', fontSize: '0.9rem', color: '#334155', fontWeight: '700'}}>Doktor Paneli</p>
                    </div>

                    <button
                        onClick={onLogout}
                        className="logout-btn"
                        style={{width: '100%', backgroundColor: '#fef2f2', color: '#d32f2f', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: '600', transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                        onMouseOver={(e) => { e.target.style.backgroundColor = '#d32f2f'; e.target.style.color = '#ffffff'; }}
                        onMouseOut={(e) => { e.target.style.backgroundColor = '#fef2f2'; e.target.style.color = '#d32f2f'; }}
                    >
                        <FaSignOutAlt /> Çıkış Yap
                    </button>
                </div>
            </div>

            {/* ANA İÇERİK */}
            <div className="main-content" style={{backgroundColor: '#ffffff', padding: '40px'}}>
                <div className="header" style={{marginBottom: '40px', borderBottom: 'none'}}>
                    <h1 style={{color: '#0f172a', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', margin: '0'}}>
                        Merhaba, {doktorAdi}
                        <img src={stetoskopIkon} alt="Stetoskop" style={{width: '60px', height: 'auto', transform: 'translateY(-4px)'}} />
                    </h1>
                    <p style={{color: '#64748b', fontSize: '1.05rem', marginTop: '5px'}}>Bugünkü özetiniz ve müsaitlik durumunuz.</p>
                </div>

                <div className="stats-grid" style={{gap: '25px', marginBottom: '40px'}}>
                    <div className="stat-card" style={{borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', borderTop: '4px solid #0097A7', padding: '25px', backgroundColor: 'white'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px'}}>Bugünkü Randevular</h3>
                        <p style={{color: '#0097A7', fontSize: '2.5rem', marginTop: '10px', fontWeight: 'bold'}}>{stats.total}</p>
                    </div>
                    <div className="stat-card" style={{borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', borderTop: '4px solid #f59e0b', padding: '25px', backgroundColor: 'white'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px'}}>Bekleyen</h3>
                        <p style={{color: '#f59e0b', fontSize: '2.5rem', marginTop: '10px', fontWeight: 'bold'}}>{stats.waiting}</p>
                    </div>
                    <div className="stat-card" style={{borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', borderTop: '4px solid #10b981', padding: '25px', backgroundColor: 'white'}}>
                        <h3 style={{color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px'}}>Tamamlanan</h3>
                        <p style={{color: '#10b981', fontSize: '2.5rem', marginTop: '10px', fontWeight: 'bold'}}>{stats.completed}</p>
                    </div>
                </div>

                <div style={{display:'flex', gap:'25px', flexWrap:'wrap'}}>
                    <div className="form-card" style={{flex: 2, minWidth: '300px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', padding: '30px', backgroundColor: 'white'}}>
                        <h3 style={{color: '#334155', fontSize: '1.2rem', marginBottom: '25px'}}>Haftalık Yoğunluk</h3>
                        <Bar options={grafikAyarlari} data={grafikVerisi} height={90} />
                    </div>

                    <div className="form-card" style={{flex: 1, minWidth: '320px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', padding: '30px', backgroundColor: '#ffffff'}}>
                        <h3 style={{color: '#0097A7', fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <FaCalendarAlt /> Müsaitlik Yönetimi
                        </h3>
                        <p style={{color:'#64748b', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.6'}}>
                            Programınızdaki değişikliklere göre saatleri kapatabilir veya kapalı saatleri geri açabilirsiniz.
                        </p>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
                            <div>
                                <label style={{display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: '600'}}>
                                    Tarih Seçin
                                </label>
                                <input
                                    type="date"
                                    value={blockDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setBlockDate(e.target.value)}
                                    style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#334155', outline: 'none', transition: 'border 0.2s'}}
                                />
                            </div>

                            <div style={{display: 'flex', gap: '15px'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: '600'}}>
                                        <FaClock style={{marginRight: '6px', color: '#0097A7'}}/>Başlangıç
                                    </label>
                                    <select
                                        value={blockStartTime}
                                        onChange={(e) => setBlockStartTime(e.target.value)}
                                        style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#334155', outline: 'none', backgroundColor: 'white'}}
                                    >
                                        <option value="">Saat</option>
                                        {timeSlots.map(time => (
                                            <option key={`start-${time}`} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: '600'}}>
                                        <FaClock style={{marginRight: '6px', color: '#d32f2f'}}/>Bitiş
                                    </label>
                                    <select
                                        value={blockEndTime}
                                        onChange={(e) => setBlockEndTime(e.target.value)}
                                        style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#334155', outline: 'none', backgroundColor: 'white'}}
                                    >
                                        <option value="">Saat</option>
                                        {timeSlots.map(time => (
                                            <option key={`end-${time}`} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* YAN YANA İKİ BUTON: KAPAT ve GERİ AÇ */}
                        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                            <button
                                onClick={handleTimeBlock}
                                style={{
                                    flex: 1, padding: '14px', fontSize: '1rem', color: '#ffffff', fontWeight: 'bold',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    backgroundColor: '#d32f2f',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 10px rgba(211, 47, 47, 0.2)'
                                }}
                                onMouseOver={(e) => { e.target.style.backgroundColor = '#b71c1c'; }}
                                onMouseOut={(e) => { e.target.style.backgroundColor = '#d32f2f'; }}
                            >
                                <FaBan size={16} />
                                Kapat
                            </button>

                            <button
                                onClick={handleTimeUnblock}
                                style={{
                                    flex: 1, padding: '14px', fontSize: '1rem', color: '#ffffff', fontWeight: 'bold',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    backgroundColor: '#10b981', // Yeşil renk eklendi
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                }}
                                onMouseOver={(e) => { e.target.style.backgroundColor = '#059669'; }}
                                onMouseOut={(e) => { e.target.style.backgroundColor = '#10b981'; }}
                            >
                                <FaUnlock size={16} />
                                Geri Aç
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoktorPanel;