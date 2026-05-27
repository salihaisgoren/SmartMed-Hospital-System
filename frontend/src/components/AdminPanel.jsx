import React, { useState, useEffect } from 'react';
import './AdminPanel.css'; // Eski CSS kalabilir, inline style ile ezdim
import { FaUserMd, FaHospital, FaPlus, FaSignOutAlt, FaTrash, FaClipboardList } from 'react-icons/fa';

// YENİ: Logoları ve ikonları import ettik (klasör yolunu kontrol etmeyi unutma!)
import logo from '../assets/hastane-logo.png';
import kalpIkon from '../assets/kalp-ikon.png';
import stetoskopIkon from '../assets/stetoskop-ikon.png'; // Doktor panelindeki stetoskop

const AdminPanel = ({ onLogout }) => {
    const [bolumler, setBolumler] = useState([]);
    const [doktorlar, setDoktorlar] = useState([]);

    const [adSoyad, setAdSoyad] = useState("");
    const [secilenBolumId, setSecilenBolumId] = useState("");
    const [yeniBolumAdi, setYeniBolumAdi] = useState("");
    const [mesaj, setMesaj] = useState("");

    const getToken = () => {
        const userInfo = localStorage.getItem("user_info");
        return userInfo ? JSON.parse(userInfo).token : null;
    };

    const bolumleriGetir = () => {
        fetch("https://localhost:7092/api/Doctors/specialties")
            .then(res => res.json())
            .then(data => setBolumler(data))
            .catch(err => console.error("Hata:", err));
    };

    const doktorlariGetir = () => {
        fetch("https://localhost:7092/api/Doctors")
            .then(res => res.json())
            .then(data => setDoktorlar(data))
            .catch(err => console.error("Hata:", err));
    };

    useEffect(() => {
        bolumleriGetir();
        doktorlariGetir();
    }, []);

    const handleDoktorEkle = async (e) => {
        e.preventDefault();
        const token = getToken();

        if (!adSoyad || !secilenBolumId) {
            setMesaj("Lütfen tüm alanları doldurun.");
            return;
        }

        const yeniDoktor = {
            fullName: adSoyad,
            specialtyId: parseInt(secilenBolumId)
        };

        try {
            const response = await fetch("https://localhost:7092/api/Doctors", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(yeniDoktor)
            });

            if (response.ok) {
                setMesaj("Doktor başarıyla eklendi! ✅");
                setAdSoyad("");
                setSecilenBolumId("");
                doktorlariGetir();
                setTimeout(() => setMesaj(""), 3000);
            } else {
                setMesaj("Hata oluştu. Yetki sorunu. ❌");
            }
        } catch (error) {
            console.error("Hata Detayı:", error);
            setMesaj("Sunucu hatası.");
        }
    };

    const handleBolumEkle = async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!yeniBolumAdi) return;

        try {
            const response = await fetch("https://localhost:7092/api/Doctors/add-specialty", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(yeniBolumAdi)
            });

            if (response.ok) {
                setMesaj("Bölüm eklendi! ✅");
                setYeniBolumAdi("");
                bolumleriGetir();
                setTimeout(() => setMesaj(""), 3000);
            }
        } catch (error) { console.error(error); }
    };

    const handleDoktorSil = async (id) => {
        if (!window.confirm("Bu doktoru silmek istediğinize emin misiniz?")) return;

        const token = getToken();
        try {
            const response = await fetch(`https://localhost:7092/api/Doctors/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMesaj("Doktor silindi. 🗑️");
                doktorlariGetir();
                setTimeout(() => setMesaj(""), 3000);
            } else {
                setMesaj("Silinemedi. Randevusu olabilir.");
            }
        } catch (error) {
            console.error("Silme hatası:", error);
        }
    };

    const handleBolumSil = async (id) => {
        if (!window.confirm("Bu bölümü silmek istediğinize emin misiniz?")) return;

        const token = getToken();
        try {
            const response = await fetch(`https://localhost:7092/api/Doctors/specialties/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMesaj("Bölüm silindi. 🗑️");
                bolumleriGetir();
                setTimeout(() => setMesaj(""), 3000);
            } else {
                const errorText = await response.text();
                setMesaj("SİLİNEMEDİ: " + errorText);
            }
        } catch (error) {
            console.error("Hata:", error);
            setMesaj("Sunucu hatası.");
        }
    };

    return (
        <div className="admin-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>

            {/* SOL SİDEBAR (Doktor Panelinin Aynısı - Beyaz ve Logolu) */}
            <div className="sidebar" style={{ width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '40px 20px 20px 20px', textAlign: 'center' }}>
                    <img src={logo} alt="Hastane Logo" style={{ width: '120px', height: 'auto', objectFit: 'contain' }} />
                </div>

                <ul style={{ marginTop: '30px', flex: 1, padding: '0 15px', listStyleType: 'none' }}>
                    <li className="active" style={{ backgroundColor: '#0097A7', color: 'white', borderRadius: '8px', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', boxShadow: '0 4px 6px rgba(0, 151, 167, 0.2)', cursor: 'pointer' }}>
                        <FaClipboardList size={18} /> Sistem Yönetimi
                    </li>
                </ul>

                <div style={{ padding: '20px 15px 60px 15px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <img src={kalpIkon} alt="Kalp" style={{ width: '28px' }} />
                        <p style={{ margin: '0', fontSize: '0.9rem', color: '#334155', fontWeight: '700' }}>Yönetici Paneli</p>
                    </div>
                    <button onClick={onLogout} className="logout-btn" style={{ width: '100%', backgroundColor: '#fef2f2', color: '#d32f2f', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        <FaSignOutAlt /> Çıkış Yap
                    </button>
                </div>
            </div>

            {/* ANA İÇERİK */}
            <div className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

                {/* HEADER (YENİ: STETOSKOP LOGOSU EKLENDİ) */}
                <div className="header" style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: '#0f172a', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', margin: '0' }}>
                        Merhaba, Yönetici
                        {/* Doktor panelindeki stetoskop logosu */}
                        <img src={stetoskopIkon} alt="Stetoskop" style={{width: '60px', transform: 'translateY(-4px)'}} />
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '5px' }}>Sistemdeki tüm bölümleri ve doktorları buradan yönetebilirsiniz.</p>
                </div>

                {mesaj && (
                    <div style={{ padding: '15px', backgroundColor: '#e0f2f1', color: '#00695c', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', border: '1px solid #b2dfdb' }}>
                        {mesaj}
                    </div>
                )}

                {/* İSTATİSTİK KARTLARI (Sarıyı Hafiflettik) */}
                <div className="stats-grid" style={{ display: 'flex', gap: '25px', marginBottom: '40px' }}>
                    <div className="stat-card" style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '16px', borderTop: '4px solid #0097A7', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Toplam Bölüm</h3>
                        <p style={{ color: '#0097A7', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>{bolumler.length}</p>
                    </div>
                    {/* Sarı tonu minik bir aksan olarak Doktor panelindeki "Bekleyen" gibi bıraktık */}
                    <div className="stat-card" style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '16px', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Toplam Doktor</h3>
                        <p style={{ color: '#f59e0b', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>{doktorlar.length}</p>
                    </div>
                </div>

                {/* EKLEME FORMLARI (DÜZELTME: TAMAMEN TURKUAZ OLDU) */}
                <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', marginBottom: '40px' }}>
                    {/* Doktor Ekleme (Turkuaz) */}
                    <div className="form-card" style={{ flex: 1, minWidth: '320px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaPlus style={{ color: '#0097A7' }} /> Yeni Doktor Ekle
                        </h3>
                        <form onSubmit={handleDoktorEkle} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Doktor Adı Soyadı</label>
                                <input
                                    type="text"
                                    value={adSoyad}
                                    onChange={(e) => setAdSoyad(e.target.value)}
                                    placeholder="Örn: Dr. Ahmet Yılmaz"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Bölüm Seçin</label>
                                <select value={secilenBolumId} onChange={(e) => setSecilenBolumId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}>
                                    <option value="">Bölüm Seçiniz...</option>
                                    {bolumler.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" style={{ marginTop: '10px', padding: '14px', backgroundColor: '#0097A7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Doktor Kaydet
                            </button>
                        </form>
                    </div>

                    {/* Bölüm Ekleme (DÜZELTME: SARI YERİNE TURKUAZ YAPTIK) */}
                    <div className="form-card" style={{ flex: 1, minWidth: '320px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaHospital style={{ color: '#0097A7' }} /> Yeni Bölüm Ekle
                        </h3>
                        <form onSubmit={handleBolumEkle} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Bölüm Adı</label>
                                <input
                                    type="text"
                                    value={yeniBolumAdi}
                                    onChange={(e) => setYeniBolumAdi(e.target.value)}
                                    placeholder="Örn: Dermatoloji"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                            {/* Düzeltme: Buton Turkuaz oldu */}
                            <button type="submit" style={{ marginTop: '10px', padding: '14px', backgroundColor: '#0097A7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Bölüm Kaydet
                            </button>
                        </form>
                    </div>
                </div>

                {/* TABLOLAR BÖLÜMÜ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Bölüm Listesi */}
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#334155', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                            <FaHospital style={{ color: '#0097A7' }} /> Mevcut Bölüm Listesi
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '15px' }}>ID</th>
                                    <th style={{ padding: '15px' }}>BÖLÜM ADI</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>İŞLEM</th>
                                </tr>
                                </thead>
                                <tbody>
                                {bolumler.map(bolum => (
                                    <tr key={bolum.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#1e293b' }}>#{bolum.id}</td>
                                        <td style={{ padding: '15px', color: '#334155' }}>{bolum.name}</td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleBolumSil(bolum.id)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <FaTrash /> Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Doktor Listesi */}
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ color: '#334155', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                            <FaUserMd style={{ color: '#0097A7' }} /> Mevcut Doktor Listesi
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '15px' }}>ID</th>
                                    <th style={{ padding: '15px' }}>AD SOYAD</th>
                                    <th style={{ padding: '15px' }}>BÖLÜM</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>İŞLEM</th>
                                </tr>
                                </thead>
                                <tbody>
                                {doktorlar.map(dr => (
                                    <tr key={dr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#1e293b' }}>#{dr.id}</td>
                                        <td style={{ padding: '15px', color: '#334155', fontWeight: 'bold' }}>{dr.fullName}</td>
                                        <td style={{ padding: '15px' }}>
                                                <span style={{ backgroundColor: '#f0fdfa', color: '#0f766e', padding: '5px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                    {dr.specialty ? dr.specialty.name : "-"}
                                                </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleDoktorSil(dr.id)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <FaTrash /> Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default AdminPanel;