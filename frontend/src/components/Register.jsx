import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './Register.css';
import logoResmi from '../assets/hastane-logo.png';
import kalpResmi from '../assets/kalp-ikon.png';
import stetoskopResmi from '../assets/stetoskop-ikon.png';

const Register = ({ onGoToLogin }) => {
    const [tcNo, setTcNo] = useState("");
    const [adSoyad, setAdSoyad] = useState("");
    const [telefon, setTelefon] = useState("");
    const [email, setEmail] = useState("");
    const [sifre, setSifre] = useState("");

    // 👇 YENİ: Doğum Yılı State'i
    const [birthYear, setBirthYear] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [hataMesaji, setHataMesaji] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setHataMesaji("");

        // 👇 YENİ: Doğum yılı kontrolü eklendi
        if (!tcNo || !adSoyad || !telefon || !email || !sifre || !birthYear) {
            setHataMesaji("Lütfen tüm alanları doldurunuz.");
            return;
        }

        if (tcNo.length !== 11) {
            setHataMesaji("TC Kimlik numarası 11 haneli olmalıdır.");
            return;
        }

        const telefonRegex = /^05\d{9}$/;
        if (!telefonRegex.test(telefon)) {
            setHataMesaji("Geçersiz telefon no! Numaranız '05' ile başlamalı ve 11 haneli olmalıdır.");
            return;
        }

        if (!email.includes("@") || !email.includes(".")) {
            setHataMesaji("Geçersiz mail adresi! Lütfen kontrol ediniz.");
            return;
        }

        if (sifre.length < 8) {
            setHataMesaji("Şifreniz en az 8 karakter olmalıdır.");
            return;
        }

        // 👇 YENİ: Doğum Yılı backend'e gidiyor
        const yeniKullanici = {
            tcNo: tcNo,
            adSoyad: adSoyad,
            telefon: telefon,
            email: email,
            sifre: sifre,
            birthYear: parseInt(birthYear) // Backend int bekliyor
        };

        try {
            const response = await fetch("https://localhost:7092/api/Auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(yeniKullanici)
            });

            if (response.ok) {
                alert("Kayıt Başarılı! Veritabanına eklendi. Giriş ekranına yönlendiriliyorsunuz.");
                onGoToLogin();
            } else {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    setHataMesaji(errorJson.title || errorJson.message || errorText);
                } catch {
                    setHataMesaji(errorText || "Kayıt işlemi başarısız oldu.");
                }
            }
        } catch (error) {
            console.error("Bağlantı Hatası:", error);
            setHataMesaji("Sunucuya bağlanılamadı. API projesinin çalıştığından emin olun.");
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <img src={logoResmi} alt="Logo" className="register-logo" />
                <img src={kalpResmi} alt="Kalp" className="decor-icon icon-left" />
                <img src={stetoskopResmi} alt="Steteskop" className="decor-icon icon-right" />

                <form onSubmit={handleRegister}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>TC Kimlik No</label>
                            <input
                                type="text" className="form-input"
                                maxLength="11"
                                value={tcNo} onChange={(e) => /^\d*$/.test(e.target.value) && setTcNo(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Ad Soyad</label>
                            <input
                                type="text" className="form-input"
                                value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 👇 YENİ: Doğum Yılı Inputu eklendi, tasarım bozulmasın diye Telefon ile aynı satırda 👇 */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Telefon</label>
                            <input
                                type="text" className="form-input" placeholder="05..."
                                maxLength="11"
                                value={telefon} onChange={(e) => /^\d*$/.test(e.target.value) && setTelefon(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Doğum Yılı</label>
                            <input
                                type="number" className="form-input" placeholder="Örn: 1955"
                                min="1900" max="2026"
                                value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* E-Posta ve Şifre tek başına alt satıra alındı */}
                    <div className="form-group">
                        <label>E-Posta</label>
                        <input
                            type="email" className="form-input" placeholder="mail@ornek.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre Oluştur</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"} className="form-input" placeholder="Güçlü bir şifre giriniz"
                                value={sifre} onChange={(e) => setSifre(e.target.value)}
                            />
                            <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>
                    </div>

                    <div className="password-rules">
                        <strong>⚠️ Şifre Kuralları:</strong>
                        <ul>
                            <li>En az 8 karakter uzunluğunda</li>
                            <li>En az 1 harf (a-z, A-Z)</li>
                            <li>En az 1 rakam (0-9)</li>
                            <li>En az 1 noktalama işareti (.,;?!@...)</li>
                        </ul>
                    </div>

                    {hataMesaji && (
                        <div className="error-box">
                            {hataMesaji}
                        </div>
                    )}

                    <button type="submit" className="btn-register">Kaydı Tamamla</button>

                    <div className="login-link-container">
                        Zaten hesabınız var mı?{' '}
                        <span onClick={onGoToLogin} className="login-link-text">
                            Giriş Yap
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;