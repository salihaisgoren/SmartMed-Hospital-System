import React, { useState } from 'react';

const ForgotPassword = ({ onGoToLogin }) => {
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [mesaj, setMesaj] = useState("");
    const [hata, setHata] = useState("");
    const [loading, setLoading] = useState(false);


    const handleKodGonder = async (e) => {
        e.preventDefault();
        setHata("");
        setLoading(true);

        try {
            const response = await fetch(`https://localhost:7092/api/Auth/forgot-password?email=${encodeURIComponent(email)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            if (response.ok) {
                setStep(2); // Başarılıysa 2. aşamaya geç (Kutucuklar değişecek)
                setMesaj("Kod gönderildi! Lütfen mailinizi kontrol edin.");
            } else {
                setHata("Mail adresi bulunamadı.");
            }
        } catch (error) {

            console.error("Kod Gönderme Hatası:", error);

            setHata("Sunucu hatası.");
        } finally {
            setLoading(false);
        }
    };


    const handleSifreGuncelle = async (e) => {
        e.preventDefault();
        setHata("");
        setLoading(true);

        try {
            const response = await fetch("https://localhost:7092/api/Auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: email,
                    Code: code,
                    NewPassword: newPassword
                })
            });

            if (response.ok) {
                setStep(3); // Başarılıysa 3. aşamaya geç (Bitiş ekranı)
            } else {
                const errorText = await response.text();
                setHata(errorText || "Kod hatalı veya işlem başarısız.");
            }
        } catch (error) {

            console.error("Şifre Güncelleme Hatası:", error);

            setHata("Sunucu hatası.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>


                {step === 1 && <h2 style={{ color: '#2c3e50' }}>Şifremi Unuttum</h2>}
                {step === 2 && <h2 style={{ color: '#2c3e50' }}>Yeni Şifre Belirle</h2>}
                {step === 3 && <h2 style={{ color: '#27ae60' }}>Başarılı! 🎉</h2>}


                {step === 1 && (
                    <form onSubmit={handleKodGonder}>
                        <p style={{ color: '#7f8c8d', marginBottom: '20px', fontSize: '0.9rem' }}>
                            Kayıtlı e-posta adresinizi girin, size bir kod gönderelim.
                        </p>
                        <input
                            type="email"
                            placeholder="E-Posta Adresiniz"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
                        />
                        <button type="submit" disabled={loading} style={btnStyle}>
                            {loading ? "Gönderiliyor..." : "Kod Gönder"}
                        </button>
                    </form>
                )}


                {step === 2 && (
                    <form onSubmit={handleSifreGuncelle}>
                        <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize:'0.9rem' }}>
                            ✅ {mesaj}
                        </div>

                        <input
                            type="text"
                            placeholder="Gelen 6 Haneli Kod"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            maxLength="6"
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd', textAlign:'center', letterSpacing:'5px', fontSize:'1.2rem' }}
                        />

                        <input
                            type="password"
                            placeholder="Yeni Şifreniz"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
                        />

                        <button type="submit" disabled={loading} style={btnStyle}>
                            {loading ? "Güncelleniyor..." : "Şifreyi Değiştir"}
                        </button>
                    </form>
                )}


                {step === 3 && (
                    <div>
                        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
                            Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
                        </p>
                        <button onClick={onGoToLogin} style={{ ...btnStyle, backgroundColor: '#27ae60' }}>
                            Giriş Ekranına Dön
                        </button>
                    </div>
                )}


                {hata && <div style={{ marginTop:'15px', color: 'white', backgroundColor: '#e74c3c', padding: '10px', borderRadius: '5px' }}>⚠️ {hata}</div>}

                {/* Geri Dön Butonu (Sadece 1. ve 2. adımda) */}
                {step !== 3 && (
                    <div style={{ marginTop: '20px' }}>
                        <span onClick={onGoToLogin} style={{ color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}>
                            Giriş Ekranına Dön
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};


const btnStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default ForgotPassword;