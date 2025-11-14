# משימות שטרם בוצעו / שדורשות שיפור
# משימות שטרם בוצעו / שדורשות שיפור

## ✅ משימות שכבר בוצעו

1. ✅ **שיפור זיהוי טקסטים דינמיים** - `src/textExtractor.js` נוצר עם זיהוי לפי context
2. ✅ **חיבור ל-AI API** - `src/openRouterClient.js` נוצר עם Gemini Pro ו-Nana Banana דרך OpenRouter
3. ✅ **יצירת variantGenerator** - `src/variantGenerator.js` נוצר
4. ✅ **יצירת variantManager** - `src/variantManager.js` נוצר
5. ✅ **עדכון main.js** - פקודה `--generate-variant` נוספה ל-CLI
6. ✅ **הגדרת API keys** - `.env.example` נוצר

---

## משימות קריטיות שדורשות שיפור

### 1. שיפור החלפת טקסטים ב-HTML
**קובץ:** `src/variantGenerator.js` - פונקציה `replaceTextsInHTML`

**בעיה:** הפונקציה הנוכחית לא מחליפה טקסטים בצורה מדויקת. היא מחפשת טקסטים לפי תוכן מלא, אבל לא מתאימה נכון אלמנטים עם children.

**מה צריך:**
- שיפור הלוגיקה של החלפת טקסטים
- שימוש ב-ID או classes לזיהוי מדויק יותר של אלמנטים
- טיפול נכון באלמנטים עם children
- שמירה על מבנה HTML המקורי

**קוד נוכחי:** שורות 82-120 ב-`variantGenerator.js`

---

### 2. אימות מודל Nana Banana
**קובץ:** `src/openRouterClient.js` - פונקציה `generateImage`

**בעיה:** שם המודל `nana-banana/nana-banana` הוא placeholder. צריך לבדוק מה השם הנכון של המודל ב-OpenRouter.

**מה צריך:**
- לבדוק את שם המודל הנכון ב-OpenRouter documentation
- לעדכן את `NANA_BANANA_MODEL` עם השם הנכון
- לבדוק את פורמט ה-API של יצירת תמונות ב-OpenRouter
- לוודא שהתגובה מהשרת מפורשת נכון

**קוד נוכחי:** שורה 8 ב-`openRouterClient.js`

---

### 3. טיפול בשגיאות ו-retry logic
**קבצים:** `src/openRouterClient.js`, `src/variantGenerator.js`

**בעיה:** אין טיפול בשגיאות API או retry logic במקרה של rate limits או שגיאות זמניות.

**מה צריך:**
- הוספת retry logic עם exponential backoff
- טיפול ב-rate limits
- הודעות שגיאה ברורות למשתמש
- logging מפורט לשגיאות

---

### 4. שיפור זיהוי sections
**קובץ:** `src/textExtractor.js` - פונקציה `getSection`

**בעיה:** זיהוי sections הוא בסיסי ומבוסס על שמות classes/IDs. יכול להיות לא מדויק.

**מה צריך:**
- שיפור הלוגיקה לזיהוי sections
- שימוש ב-semantic HTML tags (header, main, footer, article, aside)
- ניתוח מבנה העמוד בצורה חכמה יותר
- אפשרות למשתמש לסמן sections ידנית

---

### 5. הורדת קבצי CSS ו-images מקומית
**קובץ:** `src/zipGenerator.js`

**בעיה:** ה-ZIP כולל רק HTML. קבצי CSS ו-images נשארים חיצוניים.

**מה צריך:**
- הורדת כל קבצי CSS חיצוניים
- הורדת כל התמונות והחלפתן בקישורים מקומיים
- הורדת קבצי JavaScript (אם נדרש)
- עדכון כל הקישורים ב-HTML לקישורים מקומיים
- יצירת מבנה תיקיות מסודר ב-ZIP

---

### 6. שיפור ממשק המשתמש
**קבצים:** `public/index.html`, `public/app.js`

**בעיות:**
- אין אינדיקטור התקדמות בזמן יצירת ורסיה
- אין אפשרות לבטל תהליך
- אין תצוגה של sections לפני בחירה
- אין אפשרות לערוך sections ידנית

**מה צריך:**
- הוספת progress bar
- הוספת אפשרות לבטל
- תצוגה מקדימה של sections
- אפשרות לערוך בחירת sections
- הודעות שגיאה ברורות יותר

---

### 7. בדיקות ותיקונים
**כל הקבצים**

**מה צריך:**
- בדיקה שהכל עובד end-to-end
- תיקון שגיאות syntax/logic
- בדיקת edge cases
- בדיקת performance

---

### 8. תיעוד
**קובץ:** `README.md`

**מה צריך:**
- עדכון README עם כל התכונות החדשות
- הוראות התקנה מפורטות
- דוגמאות שימוש
- הסבר על Core Guidelines
- הסבר על מבנה הפרויקט

---

### 9. אופטימיזציה
**קבצים:** `src/variantGenerator.js`, `src/imageGenerator.js`

**בעיות:**
- יצירת תמונות נעשית ברצף (איטי)
- יצירת טקסטים נעשית ברצף (יכול להיות מקבילי יותר)

**מה צריך:**
- יצירת תמונות במקביל (עם rate limiting)
- batch processing חכם יותר
- caching של תוצאות

---

### 10. אבטחה
**קבצים:** `server.js`, `src/openRouterClient.js`

**מה צריך:**
- validation של קלט משתמש
- rate limiting ב-API
- sanitization של HTML output
- הגנה מפני XSS

---

## משימות אופציונליות לשיפור

1. **תמיכה ב-multiple variants** - יצירת מספר ורסיות בבת אחת
2. **השוואה בין ורסיות** - תצוגה side-by-side
3. **היסטוריה** - שמירת היסטוריה של שינויים
4. **Export ל-formats נוספים** - PDF, Word, וכו'
5. **Integration עם CMS** - העלאה אוטומטית ל-WordPress/Shopify וכו'


