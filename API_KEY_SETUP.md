# הגדרת OpenRouter API Key

## שגיאת 401 - No auth credentials found

אם אתה מקבל שגיאה זו, זה אומר שה-API key לא מוגדר או לא תקין.

## שלבים להגדרת API Key:

### 1. קבלת API Key מ-OpenRouter

1. היכנס ל-https://openrouter.ai/
2. צור חשבון או התחבר
3. עבור ל-**API Keys** (בתפריט העליון)
4. לחץ על **"Create Key"** או **"New Key"**
5. העתק את ה-API key שנוצר

### 2. עדכון קובץ .env

פתח את קובץ `.env` בתיקיית הפרויקט ועדכן את השורה:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

החלף את `sk-or-v1-...` ב-API key האמיתי שלך.

### 3. הפעלה מחדש של השרת

**חשוב:** אחרי עדכון קובץ `.env`, צריך להפעיל מחדש את השרת!

1. עצור את השרת (Ctrl+C)
2. הפעל מחדש:
   ```bash
   npm start
   ```

### 4. בדיקה שהכל עובד

אחרי הפעלה מחדש, נסה ליצור variant שוב. השגיאה אמורה להיעלם.

## פתרון בעיות

### השרת לא קורא את ה-.env
- ודא שקובץ `.env` נמצא בתיקיית הפרויקט (באותה תיקייה כמו `server.js`)
- ודא שאין רווחים לפני או אחרי ה-`=` בשורה
- ודא שאין גרשיים או מרכאות מסביב ל-API key

### API key לא תקין
- ודא שהעתקת את כל ה-API key (מתחיל ב-`sk-or-v1-`)
- ודא שאין רווחים או תווים נוספים
- נסה ליצור API key חדש ב-OpenRouter

### עדיין מקבל שגיאה 401
1. בדוק שהשרת הופעל מחדש אחרי עדכון ה-.env
2. בדוק בקונסול של השרת אם יש הודעת שגיאה על טעינת ה-.env
3. נסה להדפיס את ה-API key בקוד (רק לבדיקה, אל תשמור את זה):
   ```javascript
   console.log('API Key:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
   ```

## דוגמא לקובץ .env תקין:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Application URL (for OpenRouter API headers)
APP_URL=http://localhost:3000

# Server Configuration (optional)
PORT=3000
```

**חשוב:** אל תשתף את ה-API key שלך עם אחרים ואל תעלה אותו ל-Git!

