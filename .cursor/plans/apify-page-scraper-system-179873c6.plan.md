<!-- 179873c6-4312-4fba-8e51-f1c62d9873ae 8ab76fb5-739f-417d-8a47-4f788daf65ed -->
# מערכת יצירת ורסיות עמודים עם AI + Web Interface

## מצב נוכחי

✅ **שלב 1: Scraping** - הושלם

- גריפת עמודים דינמיים עם Playwright
- שמירת HTML מלא עם CSS ו-JavaScript
- יצירת template עם placeholders
- ניתוח מבנה העמוד

## השלבים הבאים

### שלב 2: שיפור זיהוי טקסטים לפי Sections

**מטרה:** לזהות בצורה מדויקת את כל הטקסטים שצריכים להיות דינמיים לפי sections

**מה צריך:**

- `src/textExtractor.js` - פונקציה משופרת לחילוץ טקסטים לפי sections
- זיהוי sections בעמוד (header, main content, footer, forms)
- שמירת הטקסט המקורי עם metadata (section, element type, context)
- יצירת רשימה מפורטת של כל הטקסטים הדינמיים

**קבצים:**

- `src/textExtractor.js` - חילוץ טקסטים משופר
- עדכון `src/structureExtractor.js` - שימוש בפונקציה החדשה

### שלב 3: חיבור ל-OpenRouter API

**מטרה:** חיבור ל-OpenRouter ליצירת טקסטים ותמונות

**מה צריך:**

- `src/openRouterClient.js` - wrapper ל-OpenRouter API
- פונקציה ליצירת טקסט חדש (שינוי ניסוח/תרגום תוך שמירת סגנון)
- פונקציה ליצירת תמונות חדשות (image generation)
- תמיכה בשפות שונות ומדינות יעד
- שמירת API key ב-environment variables

**קבצים:**

- `src/openRouterClient.js` - חיבור ל-OpenRouter
- `.env.example` - דוגמא להגדרות
- `src/imageGenerator.js` - יצירת תמונות דרך AI

### שלב 4: יצירת ורסיות

**מטרה:** יצירת ורסיה אחת של העמוד עם טקסטים ותמונות חדשים

**מה צריך:**

- `src/variantGenerator.js` - לוגיקה ליצירת ורסיה
- פונקציה שמקבלת template, sections לבחירה, שפה/מדינה
- לכל טקסט נבחר - יצירת גרסה חדשה באמצעות AI (שינוי ניסוח/תרגום)
- החלפת תמונות בתמונות חדשות שנוצרו ב-AI
- שמירת הוורסיה החדשה כ-HTML מלא

**קבצים:**

- `src/variantGenerator.js` - יצירת ורסיות
- `src/imageReplacer.js` - החלפת תמונות ב-HTML

### שלב 6: Web Interface

**מטרה:** ממשק web נוח ליצירת ורסיות

**מה צריך:**

- שרת Express.js
- ממשק React או HTML+JS פשוט
- אפשרות להזין URL
- בחירת sections לשנות (checkboxes)
- בחירת שפה/מדינה יעד
- תצוגה מקדימה של הוורסיה
- הורדת ZIP עם כל הקבצים (HTML, CSS, images)

**קבצים:**

- `server.js` - שרת Express
- `public/index.html` - ממשק משתמש
- `public/style.css` - עיצוב
- `public/app.js` - לוגיקה frontend
- `src/zipGenerator.js` - יצירת קובץ ZIP

### שלב 6: ניהול ורסיות ושמירה

**מטרה:** שמירת ורסיות וארגון קבצים

**מה צריך:**

- תיקיית `variants/` לכל עמוד
- שמירת כל ורסיה עם metadata (שפה, מדינה, sections שנשנו)
- יצירת ZIP עם כל הקבצים הנדרשים
- API endpoints לניהול ורסיות

**קבצים:**

- `src/variantManager.js` - ניהול ורסיות
- `src/zipGenerator.js` - יצירת ZIP
- עדכון `server.js` - API endpoints

## מבנה הפרויקט הסופי

```
Scrape/
├── package.json
├── server.js                 # שרת Express
├── .env                      # API keys
├── .env.example
├── public/                   # Web interface
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── scraper.js            # ✅ קיים
│   ├── structureExtractor.js # ✅ קיים
│   ├── contextAnalyzer.js    # חדש - ניתוח קונטקסט
│   ├── textExtractor.js      # חדש - חילוץ טקסטים
│   ├── templateManager.js   # חדש - ניהול templates
│   ├── openRouterClient.js   # חדש
│   ├── promptBuilder.js     # חדש - בניית prompts עם קונטקסט
│   ├── imageGenerator.js     # חדש
│   ├── variantGenerator.js   # חדש
│   ├── imageReplacer.js     # חדש
│   ├── variantManager.js    # חדש
│   └── zipGenerator.js      # חדש
├── templates/                # ✅ קיים - שמירת templates
│   ├── metadata.json         # חדש - רשימת כל ה-templates
│   └── [template-id]/       # חדש - כל template בתיקייה משלו
│       ├── template.json
│       ├── context.json     # קונטקסט של העמוד
│       └── original.html     # HTML המקורי
├── output/                   # ✅ קיים
└── variants/                 # חדש
```

## שימוש עתידי

```bash
# הפעלת השרת
npm start

# גישה לממשק
http://localhost:3000
```

## תכונות הממשק

1. **קלט:**

   - שדה להזנת URL
   - רשימת sections לבחירה (checkboxes)
   - בחירת שפה/מדינה (dropdown)
   - כפתור "צור ורסיה"

2. **תהליך:**

   - Scraping אוטומטי של העמוד
   - תצוגת sections זמינים
   - יצירת ורסיה עם AI
   - תצוגה מקדימה

3. **פלט:**

   - הורדת ZIP עם כל הקבצים
   - HTML, CSS, images

### To-dos

- [ ] שיפור זיהוי טקסטים דינמיים - יצירת textExtractor.js משופר עם זיהוי לפי context
- [ ] יצירת aiClient.js לחיבור ל-AI API (OpenAI/Claude) עם תמיכה במספר providers
- [ ] יצירת variantGenerator.js ליצירת מספר ורסיות של עמוד עם טקסטים שונים
- [ ] יצירת variantManager.js לניהול ושמירת ורסיות בצורה מסודרת
- [ ] עדכון main.js להוספת פקודה ליצירת ורסיות (--generate-variants)
- [ ] יצירת config.example.json ודוקומנטציה להגדרת API keys