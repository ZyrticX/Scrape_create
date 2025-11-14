# זרימת נתונים - מה נשלח ומה מתקבל מ-OpenRouter

## סקירה כללית

אנחנו משתמשים ב-OpenRouter כ-LLM Gateway - שולחים **input** (prompt) ומקבלים **output** (טקסט שנוצר).

---

## מה נשלח למודל (Request)

### 1. Request Body שנשלח ל-OpenRouter

```json
{
  "model": "qwen/qwen3-32b",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional content writer..."
    },
    {
      "role": "user",
      "content": "You are a professional content writer. Your task is to rewrite..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 2. System Message (נשלח פעם אחת לכל ה-prompts)

**מקור:** `src/promptBuilder.js` - `buildSystemMessage()`

```
You are a professional content writer specializing in creating marketing and landing page content.

CRITICAL GUIDELINES - MUST BE FOLLOWED IN ALL CONTENT:

1. **Company Assistance:** Always mention that the reader (customer) will receive assistance from a company member/trader throughout the entire process.

2. **Deposit Requirement:** The reader must understand that they need to deposit money, and their profit will depend on how much they deposit. The company will explain and ensure they will be profitable.

Your expertise includes:
- Maintaining brand voice and style
- Cultural adaptation for different markets
- Natural integration of key messages
- Creating compelling call-to-action content
```

### 3. User Prompt (נשלח לכל טקסט שצריך לשנות)

**מקור:** `src/promptBuilder.js` - `buildTextPrompt()`

**דוגמא:**

```
You are a professional content writer. Your task is to rewrite the following text while maintaining its core message, style, and context.

CRITICAL GUIDELINES - MUST BE FOLLOWED IN ALL CONTENT:

1. **Company Assistance:** Always mention that the reader (customer) will receive assistance from a company member/trader throughout the entire process.

2. **Deposit Requirement:** The reader must understand that they need to deposit money, and their profit will depend on how much they deposit. The company will explain and ensure they will be profitable.

**Original Text:**
"Start trading today and make profits"

**Context:**
- Page Topic: Online Trading Platform
- Page Purpose: Marketing
- Writing Style: Conversational
- Tone: Professional
- Target Audience: Traders

**Content Details:**
- Section: main
- Element Type: heading
- Role: call-to-action

**Requirements:**
- Target Language: English
- Target Country: United States
- Maintain the same style and tone as the original
- Keep the same length approximately (±20%)
- Ensure the core guidelines are naturally integrated
- Make it culturally appropriate for the target country
- Preserve any important technical terms or brand names

**Output:**
Provide only the rewritten text, without any explanations or additional commentary.
```

### 4. Headers שנשלחים

```
Authorization: Bearer sk-or-v1-...
Content-Type: application/json
HTTP-Referer: http://localhost:3000
X-Title: Page Variant Generator
```

---

## מה מתקבל מהמודל (Response)

### 1. Response Structure מ-OpenRouter

```json
{
  "id": "gen-...",
  "model": "qwen/qwen3-32b",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Start your trading journey today with our expert guidance. Our dedicated team members will assist you throughout the process, ensuring you understand how your deposit amount directly impacts your potential profits. We'll explain everything and help ensure your success."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 250,
    "completion_tokens": 45,
    "total_tokens": 295
  }
}
```

### 2. מה אנחנו לוקחים מהתגובה

**קוד:** `src/openRouterClient.js` - שורה 150-152

```javascript
if (!result.choices || !result.choices[0] || !result.choices[0].message) {
    throw new Error('Invalid response from OpenRouter API');
}

return result.choices[0].message.content.trim();
```

**אנחנו לוקחים רק את:** `result.choices[0].message.content`

**דוגמא לטקסט שמתקבל:**
```
"Start your trading journey today with our expert guidance. Our dedicated team members will assist you throughout the process, ensuring you understand how your deposit amount directly impacts your potential profits. We'll explain everything and help ensure your success."
```

---

## זרימת הנתונים המלאה

### שלב 1: חילוץ טקסטים מהעמוד
- **קובץ:** `src/variantGenerator.js` - שורות 22-23
- **פונקציה:** `extractTextsBySections()` → `getTextsForSections()`
- **תוצאה:** מערך של טקסטים שצריך לשנות

**דוגמא:**
```javascript
[
  { text: "Start trading today", section: "header", elementType: "heading", ... },
  { text: "Join thousands of traders", section: "main", elementType: "paragraph", ... },
  ...
]
```

### שלב 2: בניית Prompts
- **קובץ:** `src/variantGenerator.js` - שורות 31-41
- **פונקציה:** `buildTextPrompt()` לכל טקסט
- **תוצאה:** מערך של prompts

**דוגמא:**
```javascript
[
  "You are a professional content writer... [prompt 1]",
  "You are a professional content writer... [prompt 2]",
  ...
]
```

### שלב 3: שליחה ל-OpenRouter
- **קובץ:** `src/openRouterClient.js` - `generateTextBatch()`
- **תהליך:**
  1. מחלק ל-batches של 5 prompts
  2. שולח כל batch ל-OpenRouter
  3. ממתין לתגובה
  4. ממשיך ל-batch הבא

### שלב 4: קבלת תגובות
- **קובץ:** `src/openRouterClient.js` - `generateText()`
- **תהליך:**
  1. מקבל JSON response
  2. לוקח את `choices[0].message.content`
  3. מחזיר את הטקסט שנוצר

### שלב 5: החלפה ב-HTML
- **קובץ:** `src/variantGenerator.js` - שורה 52
- **פונקציה:** `replaceTextsInHTML()`
- **תהליך:** מחליף את הטקסטים המקוריים בטקסטים החדשים ב-HTML

---

## פרמטרים חשובים

### Temperature: 0.7
- **מה זה:** רמת יצירתיות/אקראיות
- **טווח:** 0.0 (דטרמיניסטי) עד 2.0 (יצירתי מאוד)
- **0.7:** איזון טוב בין יצירתיות לעקביות

### Max Tokens: 2000
- **מה זה:** אורך מקסימלי של התגובה
- **למה:** מונע תגובות ארוכות מדי

### Batch Size: 5
- **מה זה:** מספר prompts שמעובדים במקביל
- **למה:** מונע עומס על ה-API ומקטין rate limits

---

## דוגמא מלאה

### Input שנשלח:
```json
{
  "model": "qwen/qwen3-32b",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional content writer..."
    },
    {
      "role": "user",
      "content": "Rewrite: 'Start trading today' for English/USA market, maintain style, include company assistance and deposit messaging"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### Output שמתקבל:
```json
{
  "choices": [{
    "message": {
      "content": "Start your trading journey today with our expert guidance. Our dedicated team members will assist you throughout the process, ensuring you understand how your deposit amount directly impacts your potential profits."
    }
  }]
}
```

### מה אנחנו לוקחים:
```
"Start your trading journey today with our expert guidance. Our dedicated team members will assist you throughout the process, ensuring you understand how your deposit amount directly impacts your potential profits."
```

---

## סיכום

1. **שולחים:** System message + User prompt (עם הטקסט המקורי והקונטקסט)
2. **מקבלים:** JSON עם `choices[0].message.content` - הטקסט החדש שנוצר
3. **משתמשים:** מחליפים את הטקסט המקורי בטקסט החדש ב-HTML

זה הכל! פשוט LLM Gateway - input → output.

