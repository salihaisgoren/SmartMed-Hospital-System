import React, { useState } from 'react';

// İkonları içe aktarıyoruz
import steteskopResmi from '../assets/stetoskop-ikon.png';
import kalpResmi from '../assets/kalp-ikon.png';

const YapayZekaKutusu = ({ onGecis }) => {
    const [sikayet, setSikayet] = useState('');
    const [sonuc, setSonuc] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(false);

    // C# API'den gelecek doktorları tutacağımız State
    const [onerilenDoktorlar, setOnerilenDoktorlar] = useState([]);

    // Tema Rengi (Turkuaz)
    const themeColor = '#0097A7';


    const analizEt = async () => {
        if (!sikayet.trim()) {
            alert("Lütfen şikayetinizi yazın.");
            return;
        }

        setYukleniyor(true);
        setSonuc(null);
        setOnerilenDoktorlar([]);

        try {
            // 1. Python API'ye istek
            const response = await fetch('http://127.0.0.1:5000/tahmin-et', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sikayet: sikayet })
            });

            const data = await response.json();
            setSonuc(data);

            // 2. YENİ YAPI: Python'dan gelen ismi DİREKT olarak C#'a yolla!
            const bolumAdi = data.bolum;

            // Not: İsimde boşluk veya Türkçe karakter (Örn: Göz Hastalıkları) olacağı için
            // URL'nin bozulmaması adına encodeURIComponent kullanıyoruz.
            const url = `https://localhost:7092/api/SmartAssistant/suggestions/by-name/${encodeURIComponent(bolumAdi)}`;
            const doktorResponse = await fetch(url);

            if (doktorResponse.ok) {
                const doktorlarData = await doktorResponse.json();
                setOnerilenDoktorlar(doktorlarData);
            } else {
                setOnerilenDoktorlar([]);
            }

        } catch (error) {
            console.error("Hata:", error);
            alert("Sistem şu an yanıt veremiyor, lütfen daha sonra tekrar deneyiniz.");
        } finally {
            setYukleniyor(false);
        }
    };

    // YENİ: Niyet Hafızası (Intent Retention) Fonksiyonu
    const randevuIcinGirisYap = (secilenDoktor) => {
        // 1. Seçilen randevu detaylarını tarayıcıya kaydet
        const randevuNiyeti = {
            doktorId: secilenDoktor.doctorId,
            doktorAdi: secilenDoktor.doctorName,
            tarih: secilenDoktor.earliestAvailableDate,
            saat: secilenDoktor.earliestAvailableTime,
            bolum: sonuc.bolum
        };

        localStorage.setItem("bekleyenRandevu", JSON.stringify(randevuNiyeti));

        // 2. Kullanıcıyı Giriş ekranına yönlendir (Alert yok, pürüzsüz geçiş)
        if (onGecis) {
            onGecis();
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: '100vh', backgroundColor: '#FFF',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            <div style={{
                backgroundColor: 'white', padding: '40px', borderRadius: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.1)', width: '100%',
                maxWidth: '600px', textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>

                <img src={steteskopResmi} alt="Steteskop" style={{ position: 'absolute', top: '20px', left: '20px', height: '70px', objectFit: 'contain', opacity: 0.7 }} />
                <img src={kalpResmi} alt="Kalp" style={{ position: 'absolute', top: '20px', right: '20px', height: '60px', objectFit: 'contain', opacity: 0.7 }} />

                <h1 style={{ color: themeColor, marginBottom: '15px', fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>
                    Akıllı Asistan
                </h1>

                <p style={{ color: '#000000', marginBottom: '30px', fontSize: '18px' }}>
                    Hoş geldiniz. Size en uygun bölümü bulabilmemiz için lütfen şikayetinizi aşağıya yazınız.
                </p>

                <textarea
                    rows="3"
                    placeholder="Örn: Başım ağrıyor, midem bulanıyor..."
                    value={sikayet}
                    onChange={(e) => setSikayet(e.target.value)}
                    style={{
                        width: '100%', padding: '15px', borderRadius: '10px', border: '2px solid #eee',
                        backgroundColor: '#f9f9f9', marginBottom: '25px', fontSize: '16px', resize: 'none',
                        outline: 'none', color: '#333', transition: 'border-color 0.3s', fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = themeColor}
                    onBlur={(e) => e.target.style.borderColor = '#eee'}
                />

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={analizEt}
                        disabled={yukleniyor}
                        style={{
                            padding: '12px 40px', backgroundColor: yukleniyor ? '#b2dfdb' : themeColor,
                            color: 'white', border: 'none', borderRadius: '50px',
                            cursor: yukleniyor ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold',
                            boxShadow: `0 5px 15px ${themeColor}66`, transition: 'transform 0.2s',
                        }}
                    >
                        {yukleniyor ? 'Analiz Ediliyor...' : 'Analiz Et'}
                    </button>

                    <button
                        onClick={onGecis}
                        style={{
                            padding: '12px 40px', backgroundColor: 'white', color: themeColor,
                            border: `2px solid ${themeColor}`, borderRadius: '50px', cursor: 'pointer',
                            fontSize: '16px', fontWeight: 'bold', transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e0f2f1'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                    >
                        Giriş Yap
                    </button>
                </div>

                {sonuc && (
                    <div style={{
                        marginTop: '35px', padding: '20px', backgroundColor: '#e0f2f1',
                        borderRadius: '15px', borderLeft: `6px solid ${themeColor}`,
                        animation: 'fadeInUp 0.5s ease-out', textAlign: 'left'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', color: themeColor, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            ✅ Önerilen Bölüm
                        </h4>
                        <h2 style={{ margin: 0, color: themeColor, fontSize: '26px' }}>
                            {sonuc.bolum}
                        </h2>
                    </div>
                )}

                {onerilenDoktorlar.length > 0 && (
                    <div style={{ marginTop: '20px', animation: 'fadeInUp 0.7s ease-out', textAlign: 'left' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            📅 En Yakın Müsait Doktorlar
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {onerilenDoktorlar.map((doktor) => {
                                const tarih = new Date(doktor.earliestAvailableDate).toLocaleDateString('tr-TR', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                });

                                return (
                                    <div key={doktor.doctorId} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '15px', backgroundColor: '#fdfdfd', border: '1px solid #eee',
                                        borderRadius: '12px', transition: 'all 0.3s ease'
                                    }}
                                         onMouseOver={(e) => {
                                             e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                             e.currentTarget.style.borderColor = '#ccc';
                                         }}
                                         onMouseOut={(e) => {
                                             e.currentTarget.style.boxShadow = 'none';
                                             e.currentTarget.style.borderColor = '#eee';
                                         }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                                                {doktor.doctorName}
                                            </span>
                                            <span style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                                                İlk Boş: <span style={{ color: themeColor, fontWeight: 'bold' }}>{tarih} - {doktor.earliestAvailableTime}</span>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => randevuIcinGirisYap(doktor)}
                                            style={{
                                                backgroundColor: themeColor, color: 'white', border: 'none',
                                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                                fontWeight: 'bold', fontSize: '13px', transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.backgroundColor = '#007c8a'}
                                            onMouseOut={(e) => e.target.style.backgroundColor = themeColor}
                                        >
                                            Randevu Al
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default YapayZekaKutusu;