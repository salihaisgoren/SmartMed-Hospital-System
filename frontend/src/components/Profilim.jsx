import React, { useState, useEffect } from 'react';
import './Profilim.css';
import { FaUserCircle, FaIdCard, FaPhone, FaEnvelope, FaSave, FaArrowLeft, FaLock } from 'react-icons/fa';

const Profilim = ({ onBack }) => {
    const [tcNo, setTcNo] = useState("");
    const [adSoyad, setAdSoyad] = useState("");
    const [telefon, setTelefon] = useState("");
    const [email, setEmail] = useState("");
    const [sifre, setSifre] = useState("");

    const [mesaj, setMesaj] = useState("");
    const [yukleniyor, setYukleniyor] = useState(true);

    const getHastaId = () => {
        const userInfo = localStorage.getItem("user_info");
        if (userInfo) {
            const userObj = JSON.parse(userInfo);
            return userObj.id || userObj.Id || userObj.userId;
        }
        return null;
    };

    useEffect(() => {
        const veriCek = async () => {
            const id = getHastaId();
            if (!id) {
                setYukleniyor(false);
                return;
            }

            try {
                const response = await fetch(`https://localhost:7092/api/Users/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setTcNo(data.tcKimlikNo);
                    setAdSoyad(data.fullName);
                    setTelefon(data.phoneNumber || "");
                    setEmail(data.email || "");
                }
            } catch (error) {
                console.error("Profil yüklenirken hata:", error);
            } finally {
                setYukleniyor(false);
            }
        };

        veriCek();
    }, []);

    const handleGuncelle = async (e) => {
        e.preventDefault();
        setMesaj("");

        const id = getHastaId();

        const guncelVeri = {
            email: email,
            phoneNumber: telefon,
            password: sifre
        };

        try {
            const response = await fetch(`https://localhost:7092/api/Users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(guncelVeri)
            });

            const result = await response.json();

            if (response.ok) {
                setMesaj("Bilgileriniz başarıyla güncellendi! ✅");
                setSifre("");
                setTimeout(() => setMesaj(""), 3000);
            } else {
                setMesaj(result.message || "Güncelleme başarısız oldu. ❌");
            }
        } catch (error) {
            console.error("Güncelleme hatası:", error);
            setMesaj("Sunucu hatası.");
        }
    };

    return (
        <div className="profil-container">
            <button className="back-btn" onClick={onBack}>
                <FaArrowLeft /> Geri Dön
            </button>

            <div className="profil-card">
                <div className="profil-header">
                    <FaUserCircle className="profil-icon" />
                    <h2>Profil Bilgilerim</h2>
                    <p>Kişisel bilgilerinizi buradan güncelleyebilirsiniz.</p>
                </div>

                {yukleniyor ? (
                    <p style={{textAlign:'center'}}>Bilgiler yükleniyor...</p>
                ) : (
                    <form onSubmit={handleGuncelle} className="profil-form">

                        <div className="form-group disabled-group">
                            <label><FaIdCard /> TC Kimlik No</label>
                            <input type="text" value={tcNo} disabled />
                        </div>

                        <div className="form-group disabled-group">
                            <label><FaUserCircle /> Ad Soyad</label>
                            <input type="text" value={adSoyad} disabled />
                        </div>

                        <div className="form-group">
                            <label><FaPhone /> Telefon Numarası</label>
                            <input
                                type="text"
                                value={telefon}
                                onChange={(e) => setTelefon(e.target.value)}
                                placeholder="05..."
                                maxLength="11"
                            />
                        </div>

                        <div className="form-group">
                            <label><FaEnvelope /> E-Posta Adresi</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="mail@ornek.com"
                            />
                        </div>

                        <div className="form-group">
                            <label style={{color: '#d32f2f'}}><FaLock /> Yeni Şifre (İsteğe Bağlı)</label>
                            <input
                                type="password"
                                value={sifre}
                                onChange={(e) => setSifre(e.target.value)}
                                placeholder="Değiştirmek istemiyorsanız boş bırakın"
                                minLength="6"
                            />
                            <small style={{color:'#777', fontSize:'0.8rem', display:'block', marginTop:'5px'}}>
                                * Şifrenizi değiştirmek istemiyorsanız burayı boş bırakın.
                            </small>
                        </div>

                        <button type="submit" className="save-btn">
                            <FaSave /> Değişiklikleri Kaydet
                        </button>

                        {mesaj && <div className="profil-msg">{mesaj}</div>}
                    </form>
                )}
            </div>
        </div>
    );
};

export default Profilim;