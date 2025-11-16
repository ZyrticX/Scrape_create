# 📁 מבנה הפרויקט - Scrape & Create

מערכת ליצירת וריאנטים של דפי נחיתה באמצעות AI - סוקרת דף קיים ויוצרת גרסאות חדשות עם תוכן שונה באותו עיצוב.

---

## 🗂️ מבנה התיקיות והקבצים

```
Scrape_create/
├── 📄 server.js                    # שרת Express - נקודת הכניסה הראשית
├── 📄 package.json                 # תלויות NPM והגדרות הפרויקט
├── 📄 ecosystem.config.cjs         # הגדרות PM2 לריצה ב-production
├── 📄 .env                         # משתני סביבה (API keys)
├── 📄 .env.example                 # דוגמה למשתני סביבה
├── 📄 .gitignore                   # קבצים שלא להעלות לגיט
│
├── 📂 public/                      # קבצי ממשק משתמש (Frontend)
│   ├── index.html                  # עמוד ראשי
│   ├── app.js                      # לוגיקת JavaScript
│   └── style.css                   # עיצוב CSS
│
├── 📂 src/                         # לוגיקת Backend
│   ├── main.js                     # נקודת כניסה לריצה מ-CLI
│   ├── scraper.js                  # סריקת דפים עם Playwright
│   ├── contextAnalyzer.js         # ניתוח הקשר של הדף
│   ├── structureExtractor.js      # חילוץ מבנה HTML
│   ├── textExtractor.js           # חילוץ טקסטים מהדף
│   ├── htmlProcessor.js           # עיבוד HTML (URLs יחסיים → מוחלטים)
│   │
│   ├── templateManager.js         # ניהול תבניות (שמירה/טעינה)
│   ├── templateGenerator.js       # יצירת תבניות
│   │
│   ├── variantGenerator.js        # יצירת וריאנטים (גישה מתקדמת)
│   ├── variantManager.js          # ניהול וריאנטים
│   │
│   ├── simpleVariantGenerator.js  # יצירת וריאנטים (גישה פשוטה - מומלץ!)
│   ├── simpleArticleExtractor.js  # חילוץ תוכן מאמר פשוט
│   ├── simpleArticleRewriter.js   # שכתוב תוכן עם AI
│   ├── simpleContentReplacer.js   # החלפת תוכן ב-HTML
│   │
│   ├── openRouterClient.js        # תקשורת עם OpenRouter API
│   ├── openRouterModels.js        # רשימת מודלים זמינים
│   ├── promptBuilder.js           # בניית Prompts ל-AI
│   ├── retryUtils.js              # לוגיקת retry עם backoff
│   │
│   ├── imageGenerator.js          # יצירת תמונות (לא בשימוש כרגע)
│   ├── imageReplacer.js           # החלפת תמונות
│   ├── resourceDownloader.js      # הורדת משאבים (CSS, JS, תמונות)
│   └── zipGenerator.js            # יצירת קבצי ZIP
│
├── 📂 templates/                   # תבניות שנשמרו
│   ├── metadata.json               # מטא-דאטה של כל התבניות
│   └── [template-id]/             # תיקייה לכל תבנית
│       ├── template.json           # מבנה התבנית
│       ├── context.json            # הקשר ומטא-דאטה
│       └── original.html           # HTML מקורי
│
├── 📂 variants/                    # וריאנטים שנוצרו
│   └── [variant-id]/              # תיקייה לכל וריאנט
│       ├── index.html              # HTML של הוריאנט
│       └── metadata.json           # מידע על הוריאנט
│
├── 📂 output/                      # קבצי פלט (לבדיקות)
├── 📂 storage/                     # אחסון זמני של Crawlee
└── 📂 data/                        # דאטה לדוגמה

```

---

## 🎯 תפקיד כל קובץ - מפורט

### **📄 קבצי שורש (Root Files)**

| קובץ | תפקיד |
|------|-------|
| `server.js` | **שרת Express הראשי** - מגדיר API endpoints, מגיש את הממשק, מנהל בקשות HTTP |
| `package.json` | **הגדרות NPM** - רשימת תלויות, סקריפטים, מידע על הפרויקט |
| `ecosystem.config.cjs` | **הגדרות PM2** - מגדיר איך PM2 מריץ את השרת (env variables, logs) |
| `.env` | **משתני סביבה** - מכיל API keys ומשתנים רגישים (לא בגיט!) |
| `.env.example` | **דוגמה ל-.env** - מראה איזה משתנים צריך להגדיר |
| `.gitignore` | **התעלמות מקבצים** - מגדיר מה לא להעלות לגיט |

---

### **📂 public/ - ממשק משתמש (Frontend)**

| קובץ | תפקיד |
|------|-------|
| `index.html` | **עמוד HTML ראשי** - הממשק הגרפי, טפסים, כפתורים |
| `app.js` | **לוגיקת JavaScript** - טיפול באירועים, קריאות API, עדכון UI |
| `style.css` | **עיצוב CSS** - סטיילינג של הממשק |

**תהליך עבודה בממשק:**
1. משתמש מזין URL או בוחר תבנית קיימת
2. `app.js` שולח בקשה ל-API
3. מקבל תוצאה ומציג בממשק

---

### **📂 src/ - Backend Logic**

#### **🔍 סריקה וחילוץ תוכן (Scraping & Extraction)**

| קובץ | תפקיד |
|------|-------|
| `scraper.js` | **סורק דפים** - משתמש ב-Playwright לטעינת דפים דינמיים, מחכה ל-JavaScript |
| `contextAnalyzer.js` | **מנתח הקשר** - מזהה מהו נושא הדף, סטייל, שפה, מבנה |
| `structureExtractor.js` | **מחלץ מבנה** - מזהה H1, H2, פסקאות, תמונות, קישורים |
| `textExtractor.js` | **מחלץ טקסטים** - שולף את כל הטקסטים מהדף לפי סקציות |
| `htmlProcessor.js` | **מעבד HTML** - ממיר URLs יחסיים למוחלטים, מנקה קוד |

**תהליך סריקה:**
```
URL → scraper.js → HTML → contextAnalyzer → מבנה + הקשר
                         → structureExtractor → רשימת אלמנטים
                         → textExtractor → טקסטים לפי סקציות
```

---

#### **📋 ניהול תבניות (Template Management)**

| קובץ | תפקיד |
|------|-------|
| `templateManager.js` | **ניהול תבניות** - שמירה, טעינה, מחיקה, רשימת תבניות |
| `templateGenerator.js` | **יוצר תבניות** - ממיר HTML למבנה תבנית |

**מבנה תבנית:**
```json
{
  "id": "uuid",
  "url": "https://...",
  "title": "כותרת הדף",
  "template": { "structure": [...] },
  "context": { "language": "en", "style": "modern" },
  "originalHtml": "<!DOCTYPE html>..."
}
```

---

#### **🎨 יצירת וריאנטים - גישה פשוטה (מומלץ!)**

| קובץ | תפקיד |
|------|-------|
| `simpleVariantGenerator.js` | **מנהל תהליך** - מתאם את כל השלבים (רק 2 קריאות API!) |
| `simpleArticleExtractor.js` | **מחלץ מאמר** - מוצא את כל הכותרות והפסקאות בדף |
| `simpleArticleRewriter.js` | **משכתב תוכן** - שולח ל-AI ומקבל תוכן חדש |
| `simpleContentReplacer.js` | **מחליף תוכן** - מכניס את התוכן החדש ל-HTML |

**תהליך יצירת וריאנט (Simple):**
```
1. Extract → מחלץ את כל התוכן (H1, H2, P)
2. Rewrite → שולח ל-AI ומקבל גרסה חדשה (1 API call)
3. Generate Comments → יוצר תגובות חדשות (1 API call)
4. Replace → מחליף את התוכן ב-HTML
```

**למה זה פשוט?**
- רק 2 קריאות API במקום 10-20
- מהיר יותר
- זול יותר
- עובד טוב יותר!

---

#### **🎨 יצירת וריאנטים - גישה מתקדמת (ישן)**

| קובץ | תפקיד |
|------|-------|
| `variantGenerator.js` | **יוצר וריאנטים** - גישה מתקדמת עם AI לכל אלמנט |
| `variantManager.js` | **מנהל וריאנטים** - שומר, טוען, רושם וריאנטים |

**למה לא משתמשים?**
- הרבה קריאות API (יקר!)
- איטי
- מסובך

---

#### **🤖 תקשורת עם AI (OpenRouter Integration)**

| קובץ | תפקיד |
|------|-------|
| `openRouterClient.js` | **לקוח API** - מתקשר עם OpenRouter, מנהל שגיאות, retry |
| `openRouterModels.js` | **רשימת מודלים** - מודלי טקסט ותמונות זמינים |
| `promptBuilder.js` | **בונה Prompts** - יוצר הוראות ל-AI באופן דינמי |
| `retryUtils.js` | **לוגיקת Retry** - מנסה שוב במקרה של שגיאה (exponential backoff) |

**תהליך קריאת API:**
```
Prompt → openRouterClient → OpenRouter API → Response
         ↓ אם נכשל
         retryUtils → ניסיון נוסף (עם המתנה)
```

---

#### **🖼️ עיבוד תמונות ומשאבים**

| קובץ | תפקיד |
|------|-------|
| `imageGenerator.js` | **יוצר תמונות** - משתמש ב-AI ליצירת תמונות (לא בשימוש כרגע) |
| `imageReplacer.js` | **מחליף תמונות** - מחליף תמונות קיימות בחדשות |
| `resourceDownloader.js` | **מוריד משאבים** - שומר CSS, JS, תמונות לוקאלית |
| `zipGenerator.js` | **יוצר ZIP** - אורז HTML + משאבים לקובץ ZIP להורדה |

---

### **📂 templates/ - אחסון תבניות**

```
templates/
├── metadata.json                    # מידע על כל התבניות
└── 1ea1c056-4309.../                # תיקייה לכל תבנית (UUID)
    ├── template.json                 # מבנה התבנית
    ├── context.json                  # הקשר (שפה, סטייל, נושא)
    └── original.html                 # HTML מקורי
```

**מה נשמר?**
- HTML מקורי מלא
- מבנה הדף (אילו אלמנטים ניתנים לשינוי)
- הקשר (שפה, מדינה, סטייל, נושא)

---

### **📂 variants/ - וריאנטים שנוצרו**

```
variants/
└── 38e5ba8e-c24f.../                # תיקייה לכל וריאנט (UUID)
    ├── index.html                    # HTML של הוריאנט
    └── metadata.json                 # מידע: שפה, מודל, תאריך
```

**מטא-דאטה מכילה:**
```json
{
  "templateId": "...",
  "originalUrl": "https://...",
  "targetLanguage": "Hebrew",
  "targetCountry": "Israel",
  "textModel": "qwen/qwen3-32b",
  "elementsModified": 45,
  "commentsModified": 12,
  "generatedAt": "2024-11-16T18:30:00Z",
  "apiCalls": 2
}
```

---

## 🔄 תרשים זרימה - איך זה עובד?

### **שלב 1: יצירת תבנית (Template)**
```
┌─────────────────┐
│  משתמש מזין URL │
└────────┬────────┘
         ↓
┌─────────────────────────────┐
│ scraper.js                  │
│ טוען דף עם Playwright      │
└────────┬────────────────────┘
         ↓
┌─────────────────────────────┐
│ contextAnalyzer.js          │
│ מנתח: נושא, שפה, סטייל     │
└────────┬────────────────────┘
         ↓
┌─────────────────────────────┐
│ structureExtractor.js       │
│ מחלץ: H1, H2, P, תמונות    │
└────────┬────────────────────┘
         ↓
┌─────────────────────────────┐
│ templateManager.js          │
│ שומר תבנית לתיקייה         │
└─────────────────────────────┘
```

### **שלב 2: יצירת וריאנט (Variant)**
```
┌──────────────────────────────┐
│ משתמש בוחר תבנית + הגדרות   │
│ (שפה: Hebrew, מדינה: Israel)│
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ simpleArticleExtractor.js    │
│ מוצא את כל התוכן בדף         │
│ → 45 אלמנטים (H1, H2, P)    │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ simpleArticleRewriter.js     │
│ שולח ל-OpenRouter AI         │
│ "כתוב מחדש בעברית..."        │
│ → תוכן חדש מלא              │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ generateComments()           │
│ יוצר תגובות עם שמות מקומיים │
│ → דוד כהן, שרה לוי...       │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ simpleContentReplacer.js     │
│ מחליף תוכן ישן ← חדש        │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ variantManager.js            │
│ שומר וריאנט חדש              │
└──────────────────────────────┘
```

---

## 🚀 API Endpoints

### **Health & Status**
- `GET /api/health` - בדיקת תקינות מערכת + API KEY

### **Templates**
- `GET /api/templates` - רשימת תבניות
- `GET /api/templates/:id` - תבנית ספציפית
- `GET /api/templates/:id/view` - צפייה ב-HTML מקורי
- `GET /api/templates/:id/file/:filename` - קובץ ספציפי (template.json, context.json, original.html)
- `GET /api/templates/:id/download` - הורדת תבנית כ-ZIP
- `POST /api/scrape` - יצירת תבנית חדשה מ-URL

### **Variants**
- `GET /api/variants` - רשימת וריאנטים
- `GET /api/variants/:id` - וריאנט ספציפי
- `GET /api/variants/:id/download` - הורדת וריאנט כ-ZIP
- `POST /api/generate-variant` - יצירת וריאנט חדש

### **Models**
- `GET /api/models/text` - רשימת מודלי טקסט זמינים
- `GET /api/models/image` - רשימת מודלי תמונות זמינים

---

## 🔑 משתני סביבה (.env)

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx   # מפתח API של OpenRouter (חובה!)
PORT=3000                             # פורט השרת
APP_URL=http://65.21.192.187:3000    # כתובת השרת (לרפרר)
```

---

## 📦 תלויות עיקריות (package.json)

| חבילה | מטרה |
|-------|------|
| `express` | שרת HTTP |
| `playwright` | סריקת דפים דינמיים |
| `cheerio` | פרסור וניתוח HTML |
| `crawlee` | מסגרת לסריקה |
| `apify` | כלים לסריקה |
| `dotenv` | טעינת משתני סביבה |
| `archiver` | יצירת קבצי ZIP |

---

## 🎯 מה כדאי להסתכל בו?

### **למתחילים:**
1. `server.js` - להבין את ה-API
2. `public/app.js` - להבין את הממשק
3. `simpleVariantGenerator.js` - להבין את התהליך

### **למפתחים:**
1. `openRouterClient.js` - לראות איך מתקשרים עם AI
2. `simpleArticleExtractor.js` - לראות איך מוצאים תוכן
3. `simpleContentReplacer.js` - לראות איך מחליפים תוכן

---

## ⚠️ קבצים שלא בשימוש (Legacy)

- `variantGenerator.js` - גישה ישנה (הרבה API calls)
- `imageGenerator.js` - יצירת תמונות (לא מופעל)
- `main.js` - ריצה מ-CLI (לא בשימוש בגרסה הנוכחית)

---

**📝 הערות:**
- הקוד משתמש ב-**ES6 Modules** (`import/export`)
- כל הקוד הוא **async/await** לטיפול באסינכרוניות
- יש **error handling** עם retry בכל מקום
- הלוגים מפורטים ב-`console.log` לדיבאג

---

**📞 תמיכה:**
- בעיות עם API? בדוק `openRouterClient.js`
- בעיות עם חילוץ תוכן? בדוק `simpleArticleExtractor.js`
- בעיות עם החלפה? בדוק `simpleContentReplacer.js`

---

✅ **המערכת מוכנה לעבודה!**

