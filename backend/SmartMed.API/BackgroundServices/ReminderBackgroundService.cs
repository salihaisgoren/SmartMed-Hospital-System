using Microsoft.EntityFrameworkCore;
using SmartMed.API.Data;
using SmartMed.API.Services;

namespace SmartMed.API.BackgroundServices
{
    public class ReminderBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public ReminderBackgroundService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // 👇 AYARLAR 👇
            // false = Sadece hedef saatte (00:00) çalışır.
            // true yaparsan saati beklemez, hemen atar.
            bool TEST_MODU = false;

            // Hedef: Gece 00:00 (Günün ilk dakikası)
            int hedefSaat = 0;
            int hedefDakika = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                // --- 1. ZAMANLAMA KISMI ---
                if (!TEST_MODU)
                {
                    var simdi = DateTime.Now;

                    // Bugünün gece 00:00'ı
                    var bugunHedef = new DateTime(simdi.Year, simdi.Month, simdi.Day, hedefSaat, hedefDakika, 0);

                    // Eğer şu an saat 00:00'ı geçtirysek (ki gün içindeysek geçtik),
                    // hedefimiz YARIN GECE 00:00 olsun.
                    if (simdi > bugunHedef)
                    {
                        bugunHedef = bugunHedef.AddDays(1);
                    }

                    var beklemeSuresi = bugunHedef - simdi;

                    Console.WriteLine($"⏳ Servis Uyku Modunda (Gece 00:00 bekleniyor).");
                    Console.WriteLine($"⏰ Hedef Zaman: {bugunHedef} (Kalan: {beklemeSuresi.Hours} saat {beklemeSuresi.Minutes} dk)");

                    // O saate kadar sistemi durdur
                    await Task.Delay(beklemeSuresi, stoppingToken);
                }

                // --- 2. MAİL GÖNDERME KISMI (VAKİT GELDİ) ---

                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

                    Console.WriteLine("🚀 Gece Bakımı Başladı: Randevu Hatırlatmaları Kontrol Ediliyor...");

                    // DÜZELTME BURADA:
                    // Saat 00:00 olduğu için, artık o günün içindeyiz. 
                    // Yani "Yarın"a değil, "Bugün"e bakmalıyız.
                    var bugun = DateTime.Today;

                    var upcomingAppointments = await context.Appointments
                        .Include(a => a.Doctor).ThenInclude(d => d.Specialty)
                        .Where(a => a.AppointmentDate.Date == bugun) // <-- Bugünün randevularını getir
                        .ToListAsync();

                    if (upcomingAppointments.Count == 0)
                    {
                        Console.WriteLine("📭 Bugün için hatırlatılacak randevu bulunamadı.");
                    }

                    foreach (var app in upcomingAppointments)
                    {
                        var hasta = await context.Users.FindAsync(app.PatientId);

                        // Eğer hasta yoksa veya maili boşsa atla
                        if (hasta == null || string.IsNullOrEmpty(hasta.Email)) continue;

                        string bolumAdi = app.Doctor.Specialty != null ? app.Doctor.Specialty.Name : "Genel Poliklinik";

                        string mesaj = $@"
                            <div style='font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; max-width: 600px; background-color: #f9f9f9;'>
                                <h2 style='color: #2c3e50; text-align: center;'>Randevu Hatırlatması 🔔</h2>
                                <p>Bugün hastanemizde randevunuz bulunmaktadır. Lütfen randevuya saatinizde geliniz.</p>
                                
                                <div style='background-color: #fff; padding: 15px; border-left: 5px solid #3498db; margin: 20px 0;'>
                                    <p><strong>📅 Tarih:</strong> {app.AppointmentDate:dd.MM.yyyy}</p>
                                    <p><strong>⏰ Saat:</strong> {app.AppointmentDate:HH:mm}</p>
                                    <p><strong>👨‍⚕️ Doktor:</strong> {app.Doctor.FullName}</p>
                                    <p><strong>🏥 Bölüm:</strong> {bolumAdi}</p>
                                </div>

                                <hr style='border: 0; border-top: 1px solid #eee;'>
                                <p style='color: #7f8c8d; font-size: 12px; text-align: center;'>
                                    Bu otomatik bir mesajdır.<br>
                                    <em>SmartMed Hastanesi Sağlıklı Günler Diler.</em>
                                </p>
                            </div>
                        ";

                        emailService.SendEmail(hasta.Email, "Randevu Hatırlatması 📅", mesaj);
                        Console.WriteLine($"✅ Mail gönderildi: {hasta.Email}");
                    }
                }

                // İşlem bitti, bir sonraki güne (24 saat sonraya) kadar bekle
                Console.WriteLine("🏁 Görev tamamlandı. Bir sonraki geceye kadar bekleniyor...");
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }
    }
}