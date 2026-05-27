from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.svm import SVC
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)

# --- 1. MODELİ YÜKLE VE EĞİT ---
print("Derin Öğrenme Modeli İndiriliyor/Yükleniyor (İlk seferde biraz sürebilir)... Lütfen Bekleyiniz 🤖")

try:
    # Cümlelerin 'anlamını' ve 'bağlamını' kavrayan çok dilli (Türkçe destekli) model
    embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

    # Veri setini oku
    data = pd.read_csv('veri.csv')

    print("Cümleler Vektörlere (Matematiksel Anlama) Çevriliyor...")
    X_embeddings = embedder.encode(data['Sikayet'].tolist())
    y = data['Bolum']

    # Sınıflandırıcı (SVM) ile vektörleri bölümlere ayırmayı öğren
    classifier = SVC(probability=True, kernel='linear')
    classifier.fit(X_embeddings, y)

    print("Derin Öğrenme Modeli Hazır! 🚀")
except Exception as e:
    print(f"HATA: Model eğitilemedi. {e}")


# --- 2. API UÇ NOKTASI ---
@app.route('/tahmin-et', methods=['POST'])
def tahmin_et():
    gelen_veri = request.get_json()
    ham_sikayet = gelen_veri.get('sikayet', '')

    if not ham_sikayet:
        return jsonify({'error': 'Lütfen şikayetinizi yazın.'}), 400

    # 1. Hastanın şikayetini doğrudan modele ver (Ön işlemeye veya sözlüğe gerek yok!)
    sikayet_vector = embedder.encode([ham_sikayet])

    # 2. Tahmin yap ve Güven Oranını hesapla
    tahmin = classifier.predict(sikayet_vector)[0]
    olasiliklar = classifier.predict_proba(sikayet_vector)[0]
    guven_orani = max(olasiliklar) * 100

    return jsonify({
        'bolum': tahmin,
        'guven_orani': round(guven_orani, 2),
        'mesaj': f"Önerilen Bölüm: {tahmin}"
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)