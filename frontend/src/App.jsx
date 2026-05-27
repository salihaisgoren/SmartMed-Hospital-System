import React, { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Randevu from './components/Randevu';
import Randevularim from './components/Randevularim';
import Profilim from './components/Profilim';
import AdminPanel from './components/AdminPanel';
import DoktorPanel from './components/DoktorPanel';
import ForgotPassword from './components/ForgotPassword';
import YapayZekaKutusu from './components/YapayZekaKutusu';

function App() {
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
        setCurrentView('login');
    };

    return (
        <div>
            {currentView === 'ai_assistant' && (
                <YapayZekaKutusu
                    onGecis={() => setCurrentView('login')}
                />
            )}

            {currentView === 'login' && (
                <Login
                    onLogin={handleLoginSuccess}
                    onGoToRegister={() => setCurrentView('register')}
                    onGoToForgotPassword={() => setCurrentView('forgotPassword')}
                    // 👇 İŞTE SİHİRLİ BAĞLANTI BURASI 👇
                    onGoToAssistant={() => setCurrentView('ai_assistant')}
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