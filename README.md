# מערכת יצירת ורסיות עמודים עם AI

מערכת מלאה ליצירת ורסיות של עמודים עם טקסטים ותמונות חדשים באמצעות AI.

## התקנה

```bash
npm install
```

## הגדרת API Key

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

## שימוש

### דרך Web Interface (מומלץ)

הפעל את השרת:

```bash
npm start
```

פתח בדפדפן: `http://localhost:3000`

הממשק מאפשר:
1. בחירת template קיים או יצירת template חדש מ-URL
2. בחירת sections לשנות
3. בחירת שפה ומדינה יעד
4. **🆕 בחירת שיטת יצירה:**
   - **Simple** - מהיר, מוכח, 2-3 API calls (מומלץ למתחילים)
   - **Multi-File Cursor** - מקיף, ניסיוני, 1 API call (תומך בתמונות)
5. בחירת מודל AI (Claude, GPT-4, Qwen, Gemini)
6. תצוגה מקדימה והורדת ZIP

### דרך CLI

#### גריפת עמוד ויצירת Template

```bash
node src/main.js http://134.122.99.27/lander/en/protrader-za-selfhosted-v3/
```

פקודה זו תבצע:
- גריפת העמוד עם Playwright (תמיכה ב-JavaScript rendering)
- ניתוח קונטקסט העמוד
- חילוץ המבנה ל-JSON template עם placeholders
- שמירת ה-template במערכת עם ID ייחודי
- יצירת HTML לדוגמא בתיקייה `output/`

## מבנה הפרויקט

```
Scrape/
├── package.json
├── server.js               # שרת Express
├── .env.example            # דוגמא להגדרות
├── .env                    # הגדרות (לא ב-git)
├── public/                 # Web interface
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── scraper.js          # גריפה עם PlaywrightCrawler
│   ├── structureExtractor.js  # חילוץ מבנה DOM
│   ├── templateGenerator.js   # יצירת HTML מתוך template
│   ├── templateManager.js     # ניהול templates במערכת
│   ├── contextAnalyzer.js     # ניתוח קונטקסט העמוד
│   ├── textExtractor.js       # חילוץ טקסטים לפי sections
│   ├── openRouterClient.js    # חיבור ל-OpenRouter (Gemini Pro + Nana Banana)
│   ├── promptBuilder.js       # בניית prompts עם Core Guidelines
│   ├── imageGenerator.js      # יצירת תמונות דרך Nana Banana
│   ├── variantGenerator.js    # יצירת ורסיות
│   ├── imageReplacer.js       # החלפת תמונות ב-HTML
│   ├── variantManager.js      # ניהול ורסיות
│   ├── zipGenerator.js        # יצירת ZIP
│   └── main.js             # CLI interface
├── templates/              # Templates שנשמרו במערכת
│   ├── metadata.json       # רשימת templates
│   └── [template-id]/     # כל template בתיקייה משלו
├── variants/               # ורסיות שנוצרו
└── output/                 # קבצי output (HTML, reports)
```

## דוגמא מלאה

### שלב 1: גריפת העמוד

```bash
node src/main.js http://134.122.99.27/lander/en/protrader-za-selfhosted-v3/
```

### שלב 2: יצירת קובץ נתונים

צור קובץ `data/protrader-new.json`:

```json
{
  "pageTitle": "New Trading Platform - South Africa",
  "mainHeadline": "Revolutionary AI Trading Platform Now Available",
  "introText": "A groundbreaking platform that simplifies online trading for South Africans."
}
```

### שלב 3: יצירת עמוד חדש

```bash
node src/main.js --generate templates/lander_en_protrader_za_selfhosted_v3_*.json --data data/protrader-new.json
```

## תכונות

### Scraping
- ✅ תמיכה בעמודים דינמיים (React/Vue/Angular)
- ✅ גריפה עם Playwright (JavaScript rendering)
- ✅ שמירת HTML מלא עם CSS ו-JavaScript
- ✅ ניתוח מבנה העמוד

### ניתוח וזיהוי
- ✅ ניתוח קונטקסט העמוד (נושא, סגנון, טון)
- ✅ זיהוי אוטומטי של sections (header, main, footer, forms)
- ✅ חילוץ טקסטים לפי sections עם metadata
- ✅ זיהוי אוטומטי של תוכן דינמי

### יצירת ורסיות עם AI
- ✅ **שתי שיטות יצירה:**
  - **Simple** - מהיר, מוכח, 2-3 API calls
  - **🆕 Multi-File Cursor** - מקיף, ניסיוני, 1 API call
- ✅ תמיכה במודלים מרובים:
  - Claude Sonnet 4 & Opus 4
  - GPT-4 Omni
  - Qwen2.5-VL-32B (תמיכה בתמונות) 🖼️
  - Gemini Pro 1.5
- ✅ יצירת טקסטים חדשים עם AI דרך OpenRouter
- ✅ יצירת תמונות חדשות עם Nana Banana דרך OpenRouter
- ✅ שמירה על קונטקסט וסגנון המקור
- ✅ Core Guidelines מובנים (סיוע מהחברה + הפקדת כסף)
- ✅ תמיכה בשפות ומדינות שונות

### ממשק וניהול
- ✅ Web interface בעברית
- ✅ ניהול templates במערכת
- ✅ בחירת sections לשנות
- ✅ תצוגה מקדימה
- ✅ הורדת ZIP עם כל הקבצים

## דרישות

- Node.js 18+
- npm או yarn

## Dependencies

- `apify` - Apify SDK v3
- `crawlee` - Crawlee עם PlaywrightCrawler
- `playwright` - Playwright browser
- `cheerio` - לעיבוד HTML
- `express` - שרת web
- `dotenv` - ניהול environment variables
- `archiver` - יצירת קבצי ZIP

## Core Guidelines

כל יצירת תוכן כוללת אוטומטית:

1. **סיוע מהחברה:** הקורא יקבל סיוע מחבר/סוחר של החברה בכל התהליך
2. **הפקדת כסף:** הקורא צריך להבין שהוא צריך להפקיד כסף, והרווח תלוי בכמה הוא מפקיד. החברה תסביר ותוודא שהוא יהיה רווחי

הנחיות אלה משולבות אוטומטית בכל הטקסטים שנוצרים.

## הערות חשובות

- המערכת משתמשת ב-Gemini Pro דרך OpenRouter ליצירת טקסטים
- המערכת משתמשת ב-Nana Banana דרך OpenRouter ליצירת תמונות
- כל templates נשמרים במערכת וניתן להשתמש בהם שוב ושוב
- ה-ZIP כולל את ה-HTML המלא עם קישורים מוחלטים לקבצים חיצוניים

