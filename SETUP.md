# הוראות הרצה לוקלית

## שלב 1: התקנת Dependencies

```bash
npm install
```

## שלב 2: התקנת Playwright Browsers

```bash
npx playwright install --with-deps
```

זה יוריד את הדפדפנים הנדרשים (Chrome, Firefox, Safari) לגריפת עמודים דינמיים.

## שלב 3: הגדרת API Key

### Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

### Linux/Mac:
```bash
cp .env.example .env
```

ערוך את קובץ `.env` והוסף את ה-OpenRouter API key שלך:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
APP_URL=http://localhost:3000
PORT=3000
```

**איך להשיג OpenRouter API Key:**
1. היכנס ל-https://openrouter.ai/
2. צור חשבון או התחבר
3. עבור ל-API Keys
4. צור API key חדש
5. העתק את ה-key והוסף אותו לקובץ `.env`

## שלב 4: הרצת השרת

```bash
npm start
```

או:

```bash
node server.js
```

השרת יעלה על פורט 3000 (או הפורט שמוגדר ב-PORT).

## שלב 5: פתיחת הדפדפן

פתח בדפדפן: **http://localhost:3000**

## שימוש במערכת

### דרך Web Interface (מומלץ)

1. **יצירת Template חדש:**
   - הכנס URL של העמוד שברצונך לגרד
   - לחץ על "Scrape & Save Template"
   - המתן לסיום הגריפה והניתוח

2. **יצירת Variant:**
   - בחר template מהרשימה
   - בחר sections לשנות (header, main, footer וכו')
   - בחר שפה ומדינה יעד
   - לחץ על "Generate Variant"
   - המתן ליצירת הטקסטים והתמונות החדשים

3. **הורדת התוצאה:**
   - לחץ על "Download ZIP"
   - הקובץ יכלול את ה-HTML, CSS, תמונות וכל הקבצים הנדרשים

### דרך CLI

#### גריפת עמוד:
```bash
node src/main.js http://example.com/page
```

#### יצירת variant:
```bash
node src/main.js --generate-variant <template-id> --sections header,main --language English --country USA
```

## פתרון בעיות

### שגיאת "Failed to launch browser"
```bash
npx playwright install --with-deps
```

### שגיאת "OPENROUTER_API_KEY is not defined"
ודא שקובץ `.env` קיים ומכיל את ה-API key.

### שגיאת Port already in use
שנה את הפורט ב-`.env`:
```env
PORT=3001
```

## מבנה התיקיות

```
Scrape/
├── .env                    # הגדרות (לא ב-git)
├── server.js              # שרת Express
├── public/                # Web interface
├── src/                   # קוד המקור
├── templates/             # Templates שנשמרו
├── variants/              # Variants שנוצרו
└── output/                # קבצי output
```

