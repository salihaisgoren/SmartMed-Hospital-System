import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { FaUserMd, FaHospital, FaPlus, FaSignOutAlt, FaTrash } from 'react-icons/fa';

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
        <div className="admin-container">
            <div className="sidebar">
                <h2>Yönetim Paneli</h2>
                <ul>
                    <li className="active"><FaUserMd /> Doktor & Bölüm</li>
                </ul>
                <button onClick={onLogout} className="logout-btn">
                    <FaSignOutAlt /> Çıkış Yap
                </button>
            </div>

            <div className="main-content">
                <div className="header">
                    <h1>Hoş Geldin, Yönetici</h1>
                    <p>Hastane yönetim ve düzenleme paneli.</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Toplam Bölüm</h3>
                        <p>{bolumler.length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Toplam Doktor</h3>
                        <p>{doktorlar.length}</p>
                    </div>
                </div>

                <div style={{display:'flex', gap:'20px', flexWrap:'wrap', marginBottom:'40px'}}>

                    {/* Doktor Ekleme */}
                    <div className="form-card" style={{flex:1}}>
                        <h3><FaPlus /> Yeni Doktor Ekle</h3>
                        <form onSubmit={handleDoktorEkle}>
                            <div className="form-group">
                                <label>Doktor Adı Soyadı</label>
                                <input
                                    type="text"
                                    value={adSoyad}
                                    onChange={(e) => setAdSoyad(e.target.value)}
                                    placeholder="Örn: Dr. Ahmet Yılmaz"
                                />
                            </div>
                            <div className="form-group">
                                <label>Bölüm Seçin</label>
                                <select value={secilenBolumId} onChange={(e) => setSecilenBolumId(e.target.value)}>
                                    <option value="">Bölüm Seçiniz...</option>
                                    {bolumler.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="save-btn">Doktor Kaydet</button>
                        </form>
                    </div>


                    <div className="form-card" style={{flex:1}}>
                        <h3><FaHospital /> Yeni Bölüm Ekle</h3>
                        <form onSubmit={handleBolumEkle}>
                            <div className="form-group">
                                <label>Bölüm Adı</label>
                                <input
                                    type="text"
                                    value={yeniBolumAdi}
                                    onChange={(e) => setYeniBolumAdi(e.target.value)}
                                    placeholder="Örn: Dermatoloji"
                                />
                            </div>
                            <button type="submit" className="save-btn" style={{backgroundColor:'#2980b9'}}>Bölüm Kaydet</button>
                        </form>
                    </div>
                </div>

                {mesaj && <p className="msg-box">{mesaj}</p>}


                <div className="doctor-list-section">
                    <div className="doctor-list-section" style={{marginTop: '30px'}}>
                        <h3>🏥 Mevcut Bölüm Listesi</h3>
                        <div className="table-container">
                            <table className="doctor-table">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Bölüm Adı</th>
                                    <th>İşlem</th>
                                </tr>
                                </thead>
                                <tbody>
                                {bolumler.map(bolum => (
                                    <tr key={bolum.id}>
                                        <td>{bolum.id}</td>
                                        <td>{bolum.name}</td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleBolumSil(bolum.id)}
                                            >
                                                <FaTrash /> Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <h3>👨‍⚕️ Mevcut Doktor Listesi</h3>
                    <div className="table-container">
                        <table className="doctor-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ad Soyad</th>
                                <th>Bölüm</th>
                                <th>İşlem</th>
                            </tr>
                            </thead>
                            <tbody>
                            {doktorlar.map(dr => (
                                <tr key={dr.id}>
                                    <td>{dr.id}</td>
                                    <td>{dr.fullName}</td>
                                    <td>{dr.specialty ? dr.specialty.name : "-"}</td>
                                    <td>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDoktorSil(dr.id)}
                                        >
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
    );
};

export default AdminPanel;