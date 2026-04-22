# لوحة الدراسات

## التشغيل:

### 1) الباك إند (FastAPI + MongoDB):
```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### 2) الواجهة:
افتح `index.html` مباشرة في المتصفح (كليك مزدوج) أو شغّل سيرفر بسيط:
```bash
python -m http.server 3000
```
ثم افتح: http://localhost:3000

### كلمة سر المعلم: `yasser`

## الملفات:
- `index.html` + `styles.css` + `app.js` — الواجهة (HTML/CSS/JS نقي)
- `server.py` + `requirements.txt` — الباك إند
- `.env.example` — نسخ كـ `.env` وعدّل المتغيرات
