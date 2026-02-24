from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

app = Flask(__name__)
CORS(app)  # React'ten gelen isteklere izin ver

# --- MODELİ EĞİT ---
print("Yapay Zeka Modeli Eğitiliyor... Lütfen Bekleyiniz 🤖")

try:
    data = pd.read_csv('veri.csv')
    X = data['Sikayet']
    y = data['Bolum']
    
    # Kelimeleri matematiğe çevir (TF-IDF) ve Sınıflandır (Naive Bayes)
    model = make_pipeline(TfidfVectorizer(), MultinomialNB())
    model.fit(X, y)
    print("Model Hazır! 🚀")
except Exception as e:
    print(f"HATA: Model eğitilemedi. {e}")

# --- API UÇ NOKTASI ---
@app.route('/tahmin-et', methods=['POST'])
def tahmin_et():
    gelen_veri = request.get_json()
    sikayet_cumlesi = gelen_veri.get('sikayet', '').lower() # Küçük harfe çevirdik

    if not sikayet_cumlesi:
        return jsonify({'error': 'Lütfen şikayetinizi yazın.'}), 400

    # --- KRİTİK KELİME FİLTRESİ (Yapay zekadan önce burası çalışır) ---
    tahmin = None
    
    if "bulantı" in sikayet_cumlesi or "mide" in sikayet_cumlesi or "kusma" in sikayet_cumlesi:
        tahmin = "Dahiliye"
    elif "idrar" in sikayet_cumlesi or "böbrek" in sikayet_cumlesi:
        tahmin = "Üroloji"
    elif "stres" in sikayet_cumlesi or "depresyon" in sikayet_cumlesi or "kaygı" in sikayet_cumlesi:
        tahmin = "Psikiyatri"
    elif "diş" in sikayet_cumlesi or "damak" in sikayet_cumlesi:
        tahmin = "Diş Hekimliği"
    elif "gebe" in sikayet_cumlesi or "hamile" in sikayet_cumlesi or "adet" in sikayet_cumlesi:
        tahmin = "Kadın Doğum"
    elif "göz" in sikayet_cumlesi or "görme" in sikayet_cumlesi:
        tahmin = "Göz Hastalıkları"
    
    # Eğer yukarıdaki anahtar kelimeler yoksa yapay zekaya sor
    if tahmin is None:
        tahmin = model.predict([sikayet_cumlesi])[0]

    # Güven Oranı (Filtreye takıldıysa %100, takılmadıysa modelden al)
    if "tahmin" in locals() and any(k in sikayet_cumlesi for k in ["idrar", "stres", "diş", "gebe", "göz"]):
        guven_orani = 100.0
    else:
        olasilik = model.predict_proba([sikayet_cumlesi])[0]
        guven_orani = max(olasilik) * 100

    return jsonify({
        'bolum': tahmin,
        'guven_orani': round(guven_orani, 2),
        'mesaj': f"Önerilen Bölüm: {tahmin}"
    })

if __name__ == '__main__':
    # 5000 portunda çalıştır
    app.run(debug=True, port=5000)