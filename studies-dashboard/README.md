# لوحة الدراسات - Studies Dashboard

نظام ويب لإدارة درجات الطلاب لمادة الدراسات الاجتماعية.

## التشغيل المحلي

### 1. الباك إند (FastAPI + MongoDB)
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### 2. الواجهة (HTML + CSS + JS)
```bash
cd frontend
cp .env.example .env
yarn install
yarn start
```

افتح http://localhost:3000

## المميزات
- لوحة شرف عامة مع ميداليات ذهبي/فضي/برونزي
- كود عشوائي 9 أرقام لكل طالب (سري)
- دخول الطالب بالكود لعرض نتيجته فقط
- لوحة معلم محمية بكلمة سر: `yasser`
- شهادات تقدير قابلة للطباعة لأعلى 3 طلاب

## كلمة سر المعلم الافتراضية
`yasser` (غيّرها من متغير البيئة `TEACHER_PASSWORD`)
