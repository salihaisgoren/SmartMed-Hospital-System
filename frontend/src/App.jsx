import React, { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Randevu from './components/Randevu';
import Randevularim from './components/Randevularim';
import Profilim from './components/Profilim';
import AdminPanel from './components/AdminPanel';
import DoktorPanel from './components/DoktorPanel';
import ForgotPassword from './components/ForgotPassword';
import YapayZekaKutusu from './components/YapayZekaKutusu'; // 👈 YENİ: Yapay Zekayı import ettik

function App() {
    // ⚠️ DEĞİŞİKLİK: Başlangıç ekranı artık 'login' değil, 'ai_assistant'
    const [currentView, setCurrentView] = useState('ai_assistant');

    const handleLoginSuccess = (role) => {
        console.log("Giriş yapan rol:", role);

        if (role === 'Admin') {
            setCurrentView('admin');
        } else if (role === 'Doctor') {
            setCurrentView('doctor');
        } else {
            setCurrentView('randevu');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user_info");
        // Çıkış yapınca tekrar Giriş ekranına dönsün (İstersen 'ai_assistant' da yapabilirsin)
        setCurrentView('login');
    };

    return (
        <div>
            {/* 👇 YENİ: İlk açılışta AKILLI ASİSTAN görünecek */}
            {currentView === 'ai_assistant' && (
                <YapayZekaKutusu
                    // "Sisteme Giriş Yap" butonuna basınca Login ekranına geçecek
                    onGecis={() => setCurrentView('login')}
                />
            )}

            {currentView === 'login' && (
                <Login
                    onLogin={handleLoginSuccess}
                    onGoToRegister={() => setCurrentView('register')}
                    onGoToForgotPassword={() => setCurrentView('forgotPassword')}
                />
            )}

            {currentView === 'register' && (
                <Register
                    onGoToLogin={() => setCurrentView('login')}
                />
            )}

            {currentView === 'forgotPassword' && (
                <ForgotPassword
                    onGoToLogin={() => setCurrentView('login')}
                />
            )}

            {currentView === 'admin' && (
                <AdminPanel
                    onLogout={handleLogout}
                />
            )}

            {currentView === 'doctor' && (
                <DoktorPanel
                    onLogout={handleLogout}
                />
            )}

            {currentView === 'randevu' && (
                <Randevu
                    onLogout={handleLogout}
                    onMyApps={() => setCurrentView('randevularim')}
                    onProfile={() => setCurrentView('profil')}
                />
            )}

            {currentView === 'randevularim' && (
                <Randevularim
                    onBack={() => setCurrentView('randevu')}
                />
            )}

            {currentView === 'profil' && (
                <Profilim
                    onBack={() => setCurrentView('randevu')}
                />
            )}
        </div>
    );
}

export default App;