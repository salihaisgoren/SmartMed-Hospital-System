import React, { useState, useEffect } from 'react';
import './Randevularim.css';
import { FaArrowLeft, FaTrashAlt, FaUserMd } from 'react-icons/fa';

const Randevularim = ({ onBack }) => {
    const [randevular, setRandevular] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);

    const getToken = () => {
        const userInfo = localStorage.getItem("user_info");
        return userInfo ? JSON.parse(userInfo).token : null;
    };

    const getUserId = () => {
        const userInfo = localStorage.getItem("user_info");
        if (!userInfo) return null;
        const parsed = JSON.parse(userInfo);
        return parsed.id || parsed.userId || parsed.Id || parsed.User?.Id;
    };

    const randevulariGetir = async () => {
        const token = getToken();
        const userId = getUserId();

        if (!token || !userId) {
            setYukleniyor(false);
            return;
        }

        try {
            const response = await fetch(`https://localhost:7092/api/Appointments/patient/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Tarihe göre sırala
                data.sort((a, b) => new Date(a.date) - new Date(b.date));
                setRandevular(data);
            } else {
                console.error("Veri çekilemedi:", await response.text());
            }
        } catch (error) {
            console.error("Hata:", error);
        } finally {
            setYukleniyor(false);
        }
    };

    const handleIptal = async (id) => {
        if (!window.confirm("Bu randevuyu iptal etmek istediğinize emin misiniz?")) return;

        const token = getToken();
        try {
            const response = await fetch(`https://localhost:7092/api/Appointments/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                alert("Randevu başarıyla iptal edildi. ✅");
                setRandevular(randevular.filter(r => r.id !== id));
            } else {
                alert("İptal işlemi başarısız.");
            }
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Sunucu hatası.");
        }
    };

    useEffect(() => {
        randevulariGetir();
    }, []);


    const simdi = new Date();
    simdi.setHours(0,0,0,0);
    const gelecekler = randevular.filter(r => new Date(r.date) >= simdi);
    const gecmisler = randevular.filter(r => new Date(r.date) < simdi);

    return (
        <div className="my-apps-container">
            <div className="back-header">
                <button onClick={onBack} className="back-btn">
                    <FaArrowLeft /> Geri Dön
                </button>
                <h2>Randevularım</h2>
            </div>

            <div className="apps-content">
                {/* --- AKTİF RANDEVULAR --- */}
                <h3 className="section-title">📅 Yaklaşan Randevular</h3>

                {yukleniyor ? <p>Yükleniyor...</p> : (
                    gelecekler.length === 0 ? <p className="no-data">Yaklaşan randevunuz bulunmamaktadır.</p> :

                        <div className="apps-grid">
                            {gelecekler.map((r) => (
                                <div key={r.id} className="app-card">
                                    <div className="card-header-row">
                                        <span className="date-badge">
                                            {new Date(r.date).toLocaleDateString('tr-TR')}
                                        </span>
                                        <span className="time-badge">
                                            {r.time}
                                        </span>
                                    </div>

                                    <div className="card-body">
                                        <h4>{r.specialtyName || "Genel Muayene"}</h4>
                                        <p className="doctor-name"><FaUserMd /> {r.doctorName}</p>
                                    </div>

                                    <div className="card-footer">
                                        <span className="status-active">Aktif</span>
                                        <button
                                            className="cancel-btn"
                                            onClick={() => handleIptal(r.id)}
                                            title="Randevuyu İptal Et"
                                        >
                                            <FaTrashAlt /> İptal Et
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                )}

                {/* --- GEÇMİŞ RANDEVULAR (YENİ TASARIM) --- */}
                <h3 className="section-title" style={{marginTop: '40px', color:'#7f8c8d', borderBottomColor:'#bdc3c7'}}>🕒 Geçmiş Randevular</h3>

                {gecmisler.length === 0 ? <p className="no-data">Geçmiş randevu kaydı yok.</p> : (
                    <div className="gecmis-liste-container">
                        {gecmisler.map(r => (
                            <div key={r.id} className="gecmis-randevu-karti">

                                {/* Sol: Doktor ve Tarih */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap:'2px' }}>
                                    <span className="gecmis-doktor">{r.doctorName}</span>
                                    <span className="gecmis-tarih">
                                        {new Date(r.date).toLocaleDateString('tr-TR')} - {r.time}
                                    </span>
                                </div>

                                {/* Orta: Bölüm Bilgisi */}
                                <div className="gecmis-bolum">
                                    {r.specialtyName || "Poliklinik"}
                                </div>

                                {/* Sağ: Durum */}
                                <div className="gecmis-durum">
                                    Tamamlandı
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Randevularim;