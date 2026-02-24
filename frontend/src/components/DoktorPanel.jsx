import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { FaUserInjured, FaSignOutAlt, FaBan } from 'react-icons/fa';

import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DoktorPanel = ({ onLogout }) => {
    const [doktorAdi] = useState(() => {
        const userInfo = localStorage.getItem("user_info");
        return userInfo ? JSON.parse(userInfo).fullName : "Doktor";
    });

    const [stats, setStats] = useState({ total: 0, waiting: 0, completed: 0 });
    const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0]);


    const [refreshTrigger, setRefreshTrigger] = useState(0);


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

        fetchData()
    }, [refreshTrigger]);

    const handleEmergencyBlock = async () => {
        if (!window.confirm("Bugün öğleden sonraki tüm randevuları iptal etmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve hastalara otomatik iptal maili gönderilir!")) {
            return;
        }

        const userInfoStr = localStorage.getItem("user_info");
        if (!userInfoStr) return;

        const userInfo = JSON.parse(userInfoStr);
        const token = userInfo.token;
        const doctorId = userInfo.userId || userInfo.id;

        try {
            const response = await fetch(`https://localhost:7092/api/Doctors/emergency-block/${doctorId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);

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
        labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma','Cumartesi'],
        datasets: [
            {
                label: 'Günlük Hasta Sayısı',
                data: weeklyData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const grafikAyarlari = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Haftalık Randevu Yoğunluğu' },
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
    };

    return (
        <div className="admin-container">
            <div className="sidebar" style={{backgroundColor: '#2c2c54'}}>
                <h2>Doktor Paneli</h2>
                <ul>
                    <li className="active"><FaUserInjured /> Randevularım</li>
                </ul>
                <button onClick={onLogout} className="logout-btn">
                    <FaSignOutAlt /> Çıkış Yap
                </button>
            </div>

            <div className="main-content">
                <div className="header">
                    <h1>Merhaba, {doktorAdi} 👋</h1>
                    <p>Bugünkü hastalarınız ve istatistikleriniz.</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Bugünkü Randevular</h3>
                        <p>{stats.total}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Bekleyen Hasta</h3>
                        <p style={{color: '#e67e22', fontWeight:'bold'}}>{stats.waiting}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Tamamlanan</h3>
                        <p style={{color: 'green', fontWeight:'bold'}}>{stats.completed}</p>
                    </div>
                </div>

                <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                    <div className="form-card" style={{flex: 2, minWidth: '300px'}}>
                        <Bar options={grafikAyarlari} data={grafikVerisi} />
                    </div>

                    <div className="form-card" style={{flex: 1, minWidth: '250px'}}>
                        <h3>⚙️ Hızlı İşlemler</h3>
                        <p style={{marginBottom:'15px', color:'#7f8c8d'}}>
                            Acil bir durum mu var? Öğleden sonraki randevuları tek tuşla iptal edip hastaları bilgilendirebilirsiniz.
                        </p>

                        <button
                            onClick={handleEmergencyBlock}
                            style={{
                                width: '100%', padding: '15px', fontSize: '1rem', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                backgroundColor: '#c0392b',
                                transition: '0.3s',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#a93226'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#c0392b'}
                        >
                            <FaBan />
                            Öğleden Sonrayı Kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoktorPanel;