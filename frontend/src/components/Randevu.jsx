import React, { useState, useEffect } from 'react';
import './Randevu.css';
import logo from '../assets/hastane-logo.png';
import kalpIkon from '../assets/kalp-ikon.png';
import stetoskopIkon from '../assets/stetoskop-ikon.png';

const Randevu = ({ onLogout, onMyApps, onProfile }) => {
    const [bolum, setBolum] = useState('');
    const [doktorId, setDoktorId] = useState('');
    const [tarih, setTarih] = useState('');
    const [saat, setSaat] = useState('');
    const [mesaj, setMesaj] = useState('');
    const [bolumlerListesi, setBolumlerListesi] = useState([]);
    const [doluSaatler, setDoluSaatler] = useState([]);

    // --- VIP KONTROLÜ ---
    const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
    const isVip = userInfo.isVip || false;

    const getHastaId = () => {
        return userInfo.id || userInfo.Id || userInfo.userId || userInfo.User?.Id;
    };

    const getToken = () => {
        return userInfo.token;
    };

    useEffect(() => {
        const veriCek = async () => {
            try {
                const response = await fetch("https://localhost:7092/api/Doctors/specialties");
                if (response.ok) {
                    const data = await response.json();
                    setBolumlerListesi(data);
                }
            } catch (error) {
                console.error("Bağlantı hatası:", error);
            }
        };
        veriCek();
    }, []);

    useEffect(() => {
        const doluSaatleriCek = async () => {
            if (doktorId && tarih) {
                try {
                    const response = await fetch(`https://localhost:7092/api/Appointments/occupied-slots?doctorId=${doktorId}&date=${tarih}`);
                    if (response.ok) {
                        const data = await response.json();
                        setDoluSaatler(data);
                    }
                } catch (error) {
                    console.error("Dolu saatler alınamadı:", error);
                }
            } else {
                setDoluSaatler([]);
            }
        };
        doluSaatleriCek();
    }, [doktorId, tarih]);

    const mevcutDoktorlar = bolumlerListesi.find(b => b.name === bolum)?.doctors || [];

    // --- SAATLERİ ÜRET ---
    const saatleriOlustur = () => {
        const saatler = [];
        for (let i = 9; i < 17; i++) {
            if (i === 12) continue; // Öğle arası

            for (let j = 0; j < 60; j += 15) {
                const saatStr = `${i < 10 ? '0' + i : i}:${j === 0 ? '00' : j}`;
                saatler.push(saatStr);
            }
        }
        return saatler;
    };

    const randevuKaydet = async (e) => {
        e.preventDefault();
        const token = getToken();
        const hastaId = getHastaId();

        if (!hastaId) {
            alert("Kullanıcı kimliği bulunamadı! Lütfen Çıkış Yapıp tekrar giriş yapın.");
            return;
        }

        if (!bolum || !doktorId || !tarih || !saat) {
            alert("Lütfen tüm alanları doldurunuz.");
            return;
        }

        const fullDate = `${tarih}T${saat}:00`;
        const yeniRandevu = {
            doctorId: parseInt(doktorId),
            patientId: parseInt(hastaId),
            appointmentDate: fullDate
        };

        try {
            const response = await fetch("https://localhost:7092/api/Appointments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(yeniRandevu)
            });

            if (response.ok) {
                setMesaj(`Randevunuz başarıyla oluşturuldu! ✅\n${tarih} - ${saat}`);
                setDoluSaatler([...doluSaatler, saat]);
                setSaat('');
                setTimeout(() => {
                    setMesaj('');
                    onMyApps();
                }, 3000);
            } else {
                const errText = await response.text();
                alert("Uyarı: " + errText);
            }
        } catch (error) {
            console.error(error);
            alert("Sunucu hatası.");
        }
    };

    return (
        <div className="r-container">
            <div className="top-buttons-container">
                <button onClick={onProfile} className="nav-btn profile-btn">Profilim</button>
                <button onClick={onMyApps} className="nav-btn apps-btn">Randevularım</button>
                <button onClick={onLogout} className="nav-btn logout-btn">Çıkış</button>
            </div>

            <div className="r-card">
                {/* 👇 YENİ YERİ: KARTIN İÇİNDE VE EN ÜSTTE 👇 */}
                {isVip && (
                    <div style={{
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px', // Altındaki logolardan biraz uzaklaştırdık
                        textAlign: 'center',
                        border: '1px solid #c3e6cb',
                        fontWeight: 'bold',
                        // maxWidth ve margin: auto'yu kaldırdık, kartın genişliğine uysun
                    }}>
                        🌟 65 Yaş Üstü Öncelikli Sistem Aktif! <br />
                        <span style={{ fontSize: '0.8rem' }}>Sabah 09:00 - 10:00 saatleri sadece size özeldir.</span>
                    </div>
                )}
                {/* 👆 ----------------------------------- 👆 */}

                <img src={kalpIkon} alt="Kalp" className="r-decorative-icon r-left" />
                <img src={stetoskopIkon} alt="Stetoskop" className="r-decorative-icon r-right" />

                <div className="r-header">
                    <img src={logo} alt="Logo" className="r-logo" />
                    <h2>HOSPITAL</h2>
                    <p>Medical Service</p>
                </div>

                <form onSubmit={randevuKaydet} className="r-form">
                    <div className="r-form-group">
                        <label>Bölüm:</label>
                        <select value={bolum} onChange={(e) => { setBolum(e.target.value); setDoktorId(''); }}>
                            <option value="">Bölüm Seçiniz</option>
                            {bolumlerListesi.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="r-form-group">
                        <label>Doktor:</label>
                        <select value={doktorId} onChange={(e) => setDoktorId(e.target.value)} disabled={!bolum}>
                            <option value="">Doktor Seçiniz</option>
                            {mevcutDoktorlar.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.fullName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="r-form-group">
                        <label>Tarih:</label>
                        <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                    </div>

                    <div className="r-form-group">
                        <label>Saat:</label>
                        <select
                            value={saat}
                            onChange={(e) => setSaat(e.target.value)}
                            disabled={!tarih || !doktorId}
                        >
                            <option value="">Uygun Saati Seçiniz</option>
                            {saatleriOlustur().map((s, i) => {
                                const isDolu = doluSaatler.includes(s);

                                // YENİ: Bu saat VIP saati mi? (09:00 - 09:45 arası)
                                const isVipSlot = parseInt(s.split(':')[0]) < 10 || s === '10:00';

                                // YENİ: Saat VIP saatiyse ve Kullanıcı VIP DEĞİLSE kilitliyoruz
                                const isVipRestricted = isVipSlot && !isVip;

                                // Saat doluysa VEYA Kullanıcıya yasaklıysa disabled yap
                                const isDisabled = isDolu || isVipRestricted;

                                // Ekranda yazacak metni ayarlıyoruz
                                let optionText = s;
                                if (isDolu) optionText += ' (DOLU)';
                                else if (isVipRestricted) optionText += ' (65+ Yaş Önceliği)';

                                return (
                                    <option
                                        key={i}
                                        value={s}
                                        disabled={isDisabled}
                                        style={
                                            isDisabled
                                                ? { color: '#999', backgroundColor: '#e0e0e0', fontStyle: 'italic' }
                                                : { color: '#000', fontWeight: 'bold' }
                                        }
                                    >
                                        {optionText}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="r-btn-container">
                        <button type="submit" className="r-btn">Randevu Al</button>
                    </div>
                </form>

                {mesaj && <div className="r-success" style={{ whiteSpace: 'pre-line', textAlign: 'center', marginTop: '10px', color: 'green', fontWeight: 'bold' }}>{mesaj}</div>}
            </div>
        </div>
    );
};

export default Randevu;