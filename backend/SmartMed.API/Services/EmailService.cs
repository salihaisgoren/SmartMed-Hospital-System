using System.Net;
using System.Net.Mail;

namespace SmartMed.API.Services
{
    public class EmailService
    {
        public void SendEmail(string toEmail, string subject, string body)
        {
            try
            {
                // Gmail ayarları (Kendi mailini buraya yazacaksın)
                var fromAddress = new MailAddress("salihaisgorenn@gmail.com", "SmartMed Hastanesi");
                var toAddress = new MailAddress(toEmail);

                // Google Uygulama Şifresi (Normal şifren değil!)
                // Nasıl alınır: Google Hesabı -> Güvenlik -> 2 Adımlı Doğrulama -> Uygulama Şifreleri
                const string fromPassword = "aaot uifs pmwq nwnk";

                var smtp = new SmtpClient
                {
                    Host = "smtp.gmail.com",
                    Port = 587,
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(fromAddress.Address, fromPassword)
                };

                using (var message = new MailMessage(fromAddress, toAddress)
                {
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true // HTML formatında renkli mail atabiliriz
                })
                {
                    smtp.Send(message);
                }
            }
            catch (Exception ex)
            {
                // Hata olursa patlamasın, konsola yazsın yeter
                Console.WriteLine("Mail atılamadı: " + ex.Message);
            }
        }
    }
}