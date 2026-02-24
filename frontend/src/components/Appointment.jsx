
import React from 'react';
import { FaHeartbeat, FaStethoscope, FaCalendarAlt, FaHospitalSymbol } from 'react-icons/fa';
import '../App.css';

const Appointment = () => {
    return (
        <div className="container" style={{flexDirection: 'column', alignItems: 'center'}}>
            <div className="appointment-container">


                <div className="header-icons">
                    <FaHeartbeat className="heart-icon" />
                    <div className="logo-section">
                        <FaHospitalSymbol className="logo-icon" />
                        <h2 className="hospital-name">HOSPITAL</h2>
                        <span className="sub-title">Medical Service</span>
                    </div>
                    <FaStethoscope className="stethoscope-icon" />
                </div>


                <div style={{maxWidth: '500px', margin: '0 auto'}}>

                    <div className="select-group">
                        <span className="label-text">Bölüm:</span>
                        <select className="custom-select">
                            <option>Bölüm Seçiniz</option>
                            <option>Kardiyoloji</option>
                            <option>Göz Hastalıkları</option>
                            <option>Dahiliye</option>
                        </select>
                    </div>

                    <div className="select-group">
                        <span className="label-text">Doktor:</span>
                        <select className="custom-select">
                            <option>Doktor Seçiniz</option>
                            <option>Dr. Ahmet Yılmaz</option>
                            <option>Dr. Ayşe Demir</option>
                        </select>
                    </div>

                    <div className="select-group">
                        <span className="label-text">Tarih:</span>
                        <div style={{position: 'relative', flex: 1}}>
                            <input type="date" className="custom-input" style={{width: '88%'}} />
                            <FaCalendarAlt style={{position:'absolute', right: 15, top: 12, color:'#333'}}/>
                        </div>
                    </div>

                    <div className="select-group">
                        <span className="label-text">Saat:</span>
                        <select className="custom-select">
                            <option>Uygun Saati Seçiniz</option>
                            <option>09:00</option>
                            <option>10:30</option>
                            <option>14:00</option>
                        </select>
                    </div>

                    <button className="btn btn-primary" style={{marginTop: '30px'}}>Randevu Al</button>

                </div>
            </div>
        </div>
    );
};

export default Appointment;