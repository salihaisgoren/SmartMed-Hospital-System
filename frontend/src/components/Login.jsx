import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa'; // YENİ: FaArrowLeft eklendi
import './Login.css';
import logoResmi from '../assets/hastane-logo.png';
import sagGorsel from '../assets/doktor-gorsel.png';

// YENİ: onGoToAssistant prop'u eklendi
const Login = ({ onLogin, onGoToRegister, onGoToForgotPassword, onGoToAssistant }) => {
    const [tcNo, setTcNo] = useState("");
    const [sifre, setSifre] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [hataMesaji, setHataMesaji] = useState("");

    const [bekleyenModal, setBekleyenModal] = useState({
        goster: false,
        randevu: null,
        kullaniciAdi: "",
        role: ""
    });
    const [islemYapiliyor, setIslemYapiliyor] = useState(false);

    const handleGiris = async (e) => {
        e.preventDefault();
        setHataMesaji("");

        if (!tcNo || !sifre) {
            setHataMesaji("Lütfen boş alanları doldurun.");
            return;
        }

        const girisVerisi = { TcNo: tcNo, Sifre: sifre };

        try {
            const response = await fetch("https://localhost:7092/api/Auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(girisVerisi)
            });

            if (response.ok) {
                const data = await response.json();

                const safeId = data.id || data.Id || data.userId || (data.user && data.user.id);
                const safeName = data.fullName || data.adSoyad || (data.user && data.user.fullName);

                localStorage.setItem("user_info", JSON.stringify({
                    token: data.token,
                    role: data.role,
                    id: safeId,
                    userId: safeId,
                    fullName: safeName,
                    isVip: data.isVip || false
                }));

                const beklemedeStr = localStorage.getItem("bekleyenRandevu");

                if (beklemedeStr && data.role === "Patient") {
                    setBekleyenModal({
                        goster: true,
                        randevu: JSON.parse(beklemedeStr),
                        kullaniciAdi: safeName,
                        role: data.role
                    });
                } else {
                    onLogin(data.role);
                }

            } else {
                const errorText = await response.text();
                setHataMesaji("Giriş başarısız: " + errorText);
            }

        } catch (error) {
            console.error("Login Hatası:", error);
            setHataMesaji("Sunucuya bağlanılamadı.");
        }
    };

    const handleRandevuOnayla = async () => {
        setIslemYapiliyor(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem("user_info"));
            const hastaId = userInfo?.id || userInfo?.userId;

            if (!hastaId) {
                alert("Kullanıcı bilgisi bulunamadı, lütfen tekrar giriş yapın.");
                return;
            }

            const yeniRandevu = {
                DoctorId: bekleyenModal.randevu.doktorId,
                PatientId: hastaId,
                AppointmentDate: bekleyenModal.randevu.tarih.split('T')[0],
                AppointmentTime: bekleyenModal.randevu.saat,
                AiAnalysis: bekleyenModal.randevu.sikayet
            };

            const response = await fetch("https://localhost:7092/api/Appointments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${userInfo.token}`
                },
                body: JSON.stringify(yeniRandevu)
            });

            if (response.ok) {
                alert(`${bekleyenModal.randevu.doktorAdi} için randevunuz başarıyla oluşturuldu!`);
                localStorage.removeItem("bekleyenRandevu");
                onLogin(bekleyenModal.role);
            } else {
                const errorText = await response.text();
                alert("Randevu oluşturulamadı: " + errorText);
            }

        } catch (error) {
            console.error("Randevu kayıt hatası:", error);
            alert("Sunucuya bağlanılamadı, lütfen daha sonra tekrar deneyiniz.");
        } finally {
            setIslemYapiliyor(false);
        }
    };

    const handleRandevuIptal = () => {
        localStorage.removeItem("bekleyenRandevu");
        onLogin(bekleyenModal.role);
    };

    return (
        <div className="login-container" style={{ position: 'relative' }}>
            <div className="login-left" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* 👇 YENİ: Düzenlenmiş ve Hizalanmış Akıllı Asistana Dön Butonu 👇 */}
                {onGoToAssistant && (
                    <div style={{ width: '100%', maxWidth: '400px', marginBottom: '15px' }}>
                        <span
                            onClick={onGoToAssistant}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#0097A7',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                transition: 'color 0.2s ease-in-out'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#007b8a'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#0097A7'}
                        >
                            <FaArrowLeft /> Akıllı Asistana Dön
                        </span>
                    </div>
                )}
                {/* 👆 -------------------------------- 👆 */}

                <img src={logoResmi} alt="Logo" className="hospital-logo" />
                <h2 className="welcome-text">Hastane Randevu Sistemine<br/>Hoş Geldiniz!</h2>

                <form onSubmit={handleGiris} style={{width:'100%', maxWidth:'400px'}}>
                    <div className="form-group">
                        <label>TC Kimlik Numarası</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="TC Kimlik Numaranız"
                            maxLength="11"
                            value={tcNo}
                            onChange={(e) => {
                                if (/^\d*$/.test(e.target.value)) setTcNo(e.target.value);
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="Şifreniz"
                                value={sifre}
                                onChange={(e) => setSifre(e.target.value)}
                            />
                            <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '15px', marginTop: '-10px' }}>
                        <span
                            onClick={onGoToForgotPassword}
                            style={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                            Şifremi Unuttum?
                        </span>
                    </div>

                    {hataMesaji && (
                        <div style={{color:'#d32f2f', background:'#ffebee', padding:'10px', borderRadius:'5px', marginBottom:'15px', fontSize:'0.9rem', fontWeight:'bold'}}>
                            <i className="fas fa-exclamation-triangle"></i> {hataMesaji}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary">Giriş Yap</button>

                    <div style={{marginTop:'15px', textAlign:'center', color:'#555'}}>
                        Hesabınız yok mu? <br/>
                        <span onClick={onGoToRegister} style={{color:'#d32f2f', fontWeight:'bold', cursor:'pointer', textDecoration:'underline'}}>
                            Hemen Kayıt Ol
                        </span>
                    </div>
                </form>
            </div>

            <div className="login-right">
                <img src={sagGorsel} alt="Görsel" className="illustration-image" />
            </div>

            {bekleyenModal.goster && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: 'white', padding: '40px', borderRadius: '20px',
                        maxWidth: '500px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        animation: 'fadeInUp 0.4s ease-out'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>

                        <h2 style={{ color: '#0097A7', marginBottom: '15px', fontWeight: 'bold' }}>
                            Hoş Geldin, {bekleyenModal.kullaniciAdi.split(' ')[0]}!
                        </h2>

                        <p style={{ fontSize: '16px', color: '#444', marginBottom: '25px', lineHeight: '1.6' }}>
                            Az önce akıllı asistanımızla <strong>{bekleyenModal.randevu.bolum}</strong> bölümünden, <strong>{bekleyenModal.randevu.doktorAdi}</strong> için bir randevu seçmiştin. <br/><br/>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                                📅 {new Date(bekleyenModal.randevu.tarih).toLocaleDateString('tr-TR')} - {bekleyenModal.randevu.saat}
                            </span>
                            <br/><br/>
                            Bu randevu işlemini şimdi tamamlamak ister misin?
                        </p>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={handleRandevuOnayla}
                                disabled={islemYapiliyor}
                                style={{
                                    padding: '12px 24px', backgroundColor: '#0097A7', color: 'white',
                                    border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold',
                                    transition: 'background 0.3s', flex: 1
                                }}>
                                {islemYapiliyor ? 'Onaylanıyor...' : 'Evet, Onayla'}
                            </button>
                            <button
                                onClick={handleRandevuIptal}
                                disabled={islemYapiliyor}
                                style={{
                                    padding: '12px 24px', backgroundColor: '#f1f1f1', color: '#555',
                                    border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold',
                                    transition: 'background 0.3s', flex: 1
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#f1f1f1'}
                            >
                                Hayır, İptal Et
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;