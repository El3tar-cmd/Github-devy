# Syntax Check Tools

مجموعة من الأدوات لفحص جودة الكود والتحقق من الأخطاء النحوية في مشروعك.

## الأدوات المتاحة

### 1. syntax-check.js
أداة شاملة للتحقق من صياغة الكود (Syntax Validation).

**المميزات:**
- فحص الأخطاء النحوية الأساسية
- التحقق من توازن الأقواس
- فحص مشاكل الاستيراد (Import Issues)
- التحقق من طول الأسطر
- كشف استخدام console.log

**الاستخدام:**
```bash
# فحص المجلدات الافتراضية (src, server, tools)
npm run syntax-check

# فحص مجلدات محددة
node tools/syntax-check.js src components

# فحص بوضع صارم
node tools/syntax-check.js --strict
```

**من خلال الـ Agent:**
```javascript
syntax_check({
  directories: ["src", "server"],
  extensions: [".ts", ".tsx"],
  strict: true
})
```

---

### 2. eslint-check.js
أداة بأسلوب ESLint للتحقق من جودة الكود.

**القواعد المدعومة:**
- `no-async-func-without-await` - دالة async بدون await
- `no-unreachable-code` - كود غير قابل للوصول
- `no-empty-function` - دالة فارغة
- `no-debugger` - استخدام debugger
- `no-duplicate-imports` - استيراد مكرر
- `no-var` - استخدام var بدلاً من let/const
- `prefer-const` - استخدام const للمتغيرات التي لا تتغير
- `no-unused-vars` - متغيرات غير مستخدمة
- `semi` - فاصلة منقوطة مفقودة
- `quotes` - استخدام غير متناسق للعلامات
- `no-multiple-empty-lines` - أسطر فارغة متعددة
- `no-trailing-spaces` - مسافات زائدة في نهاية السطر
- `indent` - مسافة بادئة غير متسقة

**الاستخدام:**
```bash
# فحص جميع المشاكل
npm run eslint-check

# فحص الأخطاء فقط
node tools/eslint-check.js --severity error

# فحص المشاكل القابلة للإصلاح فقط
node tools/eslint-check.js --fixable-only
```

**من خلال الـ Agent:**
```javascript
eslint_check({
  directories: ["src", "server"],
  severity: "error",  // "all", "error", "warning", "style"
  fixableOnly: false
})
```

---

### 3. ts-check.js
أداة متخصصة لفحص TypeScript وواجهات البرمجة.

**المميزات:**
- كشف استخدام `any` type
- التحقق من Type Assertions
- فحص دوال بدون return type
- كشف Type Parameters غير المستخدمة
- التحقق من تكرار الواجهات
- اكتشاف واجهات متشابهة

**الاستخدام:**
```bash
# فحص كامل
npm run ts-check

# فحص بدون التحقق من التكرار
node tools/ts-check.js --no-consistency

# فحص بدون الإبلاغ عن استخدام الأنواع
node tools/ts-check.js --no-type-usage
```

**من خلال الـ Agent:**
```javascript
typescript_interface_check({
  directories: ["src", "server"],
  checkConsistency: true,
  reportTypeUsage: true
})
```

---

## تشغيل جميع الفحوصات

```bash
# تشغيل جميع الفحوصات بالتسلسل
npm run check-all
```

---

## التكامل مع الـ Agent

تم إضافة هذه الأدوات إلى `src/agent/tools/toolsSchema.ts` ويمكن للـ Agent استخدامها مباشرة:

```typescript
// مثال: الـ Agent يمكنه استدعاء هذه الأدوات
await executeToolCall("syntax_check", { directories: ["src"] }, workspaceId);
await executeToolCall("eslint_check", { severity: "warning" }, workspaceId);
await executeToolCall("typescript_interface_check", {}, workspaceId);
```

---

## المخرجات

كل أداة تُرجع تقرير مفصل يحتوي على:

- **Errors**: أخطاء حرجة يجب إصلاحها
- **Warnings**: تحذيرات يُنصح بإصلاحها
- **Style Issues**: مشاكل في تنسيق الكود
- **Summary**: ملخص شامل للفحص

### مثال على المخرجات:

```
🔍 ESLint-style Syntax Checker

Found 15 files to check

src/App.tsx
  Line 15: [WARNING] Using "any" type - consider specific types
    const data: any = fetchData();

src/utils.ts
  Line 42: [ERROR] Unreachable code detected
    return result;
    console.log("This won't run");

📊 Summary:
  Files with issues: 2
  Total issues: 2
  Errors: 1
  Warnings: 1
  Style issues: 0

⚠️  Check passed with warnings
```

---

## التخصيص

يمكنك تعديل القواعد والإعدادات في كل ملف:

- **syntax-check.js**: تعديل `config.rules`
- **eslint-check.js**: تعديل `RULES` object
- **ts-check.js**: تعديل منطق الفحص في `checkTypeUsage()`

---

## المساهمة

لإضافة قواعد جديدة:

1. أضف القاعدة إلى `RULES` object في `eslint-check.js`
2. حدد `severity` (error, warning, style)
3. اكتب دالة `check()` المناسبة
4. اختبر الأداة

---

## الترخيص

هذه الأدوات جزء من مشروع Devy IDE Agent.