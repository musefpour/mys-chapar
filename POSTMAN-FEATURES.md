# امکانات برنامه Postman

سند مرجع امکانات پلتفرم **Postman** — ابتدا فهرست عنوان‌وار، سپس توضیح جزئی هر بخش.

---

## فهرست عنوان‌وار امکانات

1. [کلاینت API (API Client)](#1-کلاینت-api-api-client)
2. [پروتکل‌های پشتیبانی‌شده](#2-پروتکل‌های-پشتیبانی‌شده)
3. [Collectionها و سازمان‌دهی درخواست‌ها](#3-collectionها-و-سازمان‌دهی-درخواست‌ها)
4. [Environment و متغیرها](#4-environment-و-متغیرها)
5. [اسکریپت‌نویسی (Pre-request و Tests)](#5-اسکریپت‌نویسی-pre-request-و-tests)
6. [تست و اتوماسیون](#6-تست-و-اتوماسیون)
7. [Collection Runner](#7-collection-runner)
8. [تست عملکرد و Load Testing](#8-تست-عملکرد-و-load-testing)
9. [Mock Server](#9-mock-server)
10. [طراحی API و مشخصات (API Design / Specs)](#10-طراحی-api-و-مشخصات-api-design--specs)
11. [مستندسازی API (Documentation)](#11-مستندسازی-api-documentation)
12. [مانیتورینگ API](#12-مانیتورینگ-api)
13. [Workspaces و همکاری تیمی](#13-workspaces-و-همکاری-تیمی)
14. [نسخه‌بندی و تاریخچه](#14-نسخه‌بندی-و-تاریخچه)
15. [همگام‌سازی با Git](#15-همگام‌سازی-با-git)
16. [Postman CLI و CI/CD](#16-postman-cli-و-cicd)
17. [Flows (اتوماسیون بصری)](#17-flows-اتوماسیون-بصری)
18. [امنیت، Governance و Secrets](#18-امنیت-governance-و-secrets)
19. [API Network و توزیع API](#19-api-network-و-توزیع-api)
20. [API Catalog](#20-api-catalog)
21. [Interceptor و Proxy](#21-interceptor-و-proxy)
22. [Import / Export](#22-import--export)
23. [احراز هویت (Authentication)](#23-احراز-هویت-authentication)
24. [Cookie Manager و Session](#24-cookie-manager-و-session)
25. [Code Generation و SDK](#25-code-generation-و-sdk)
26. [Visualizer](#26-visualizer)
27. [پلن‌ها و سطح دسترسی](#27-پلن‌ها-و-سطح-دسترسی)
28. [پلتفرم‌ها و دسترسی](#28-پلتفرم‌ها-و-دسترسی)

---

## توضیح جزئی امکانات

### 1. کلاینت API (API Client)

قلب Postman یک کلاینت قدرتمند برای ساخت، ارسال و بررسی درخواست‌های HTTP/API است.

- ساخت درخواست با متدهای استاندارد: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` و متدهای سفارشی
- تنظیم URL، Query Params، Path Variables و Headers
- ارسال Body در قالب‌های مختلف: raw (JSON, XML, Text, HTML)، form-data، x-www-form-urlencoded، binary، GraphQL
- مشاهده Response شامل Status Code، Headers، Body، Time و Size
- تب‌های Preview، Pretty، Raw و Hex برای نمایش پاسخ
- ذخیره درخواست‌ها برای استفاده مجدد
- History برای بازبینی درخواست‌های اخیر
- امکان کار آفلاین (بسته به پلن و همگام‌سازی)

---

### 2. پروتکل‌های پشتیبانی‌شده

Postman فراتر از REST ساده عمل می‌کند و پروتکل‌های متنوع را در یک محیط واحد پوشش می‌دهد:

| پروتکل | کاربرد تقریبی |
|--------|----------------|
| **HTTP / REST** | APIهای کلاسیک وب |
| **GraphQL** | کوئری و Mutation با Schema introspection |
| **gRPC** | سرویس‌های مبتنی بر Protobuf و streaming |
| **WebSocket** | ارتباط دوطرفه real-time |
| **MQTT** | پیام‌رسانی IoT و pub/sub |
| **SOAP** | سرویس‌های XML قدیمی‌تر (از طریق HTTP) |
| **SSE** | Server-Sent Events |

درخواست‌های این پروتکل‌ها می‌توانند در یک Collection کنار هم قرار گیرند و در Runner یا CI اجرا شوند.

---

### 3. Collectionها و سازمان‌دهی درخواست‌ها

**Collection** واحد اصلی سازمان‌دهی در Postman است.

- گروه‌بندی درخواست‌ها در پوشه‌ها (Folders) و زیرپوشه‌ها
- ترتیب اجرای درخواست‌ها
- توضیحات و مستندات در سطح Collection / Folder / Request
- Variables سطح Collection
- Scripts مشترک در سطح Collection یا Folder
- Authorization مشترک برای همه درخواست‌های یک Collection
- مثال‌های پاسخ (Examples) برای مستندسازی و Mock
- امکان fork، share و publish کردن Collection
- قالب‌های آماده (Templates) برای شروع سریع

---

### 4. Environment و متغیرها

متغیرها امکان استفاده مجدد و جداسازی محیط‌ها (dev / staging / prod) را فراهم می‌کنند.

**انواع متغیر:**

- **Global Variables** — در کل Workspace
- **Collection Variables** — مخصوص یک Collection
- **Environment Variables** — مخصوص یک محیط (مثلاً Development)
- **Local / Temporary Variables** — در طول اجرای اسکریپت
- **Data Variables** — از فایل‌های CSV/JSON در Runner

**قابلیت‌ها:**

- سوئیچ سریع بین Environmentها
- جداسازی مقادیر `Initial` و `Current`
- متغیرهای Secret برای مخفی کردن مقادیر حساس در UI
- استفاده با سینتکس `{{variableName}}`
- Dynamic variables داخلی مثل `{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`

---

### 5. اسکریپت‌نویسی (Pre-request و Tests)

Postman از JavaScript برای اسکریپت قبل و بعد از درخواست پشتیبانی می‌کند.

**Pre-request Script:**

- آماده‌سازی داده قبل از ارسال
- تولید توکن، Timestamp، Signature
- تنظیم متغیرها به‌صورت پویا

**Tests Script:**

- نوشتن Assertion روی Status، Body، Headers، زمان پاسخ
- استخراج داده از Response و ذخیره در متغیر (مثلاً token)
- استفاده از کتابخانه `pm` و `chai`-style assertions
- تست‌های زنجیره‌ای بین چند درخواست

**نمونه Assertionها:**

```javascript
pm.test("Status is 200", () => {
  pm.response.to.have.status(200);
});

pm.test("Has token", () => {
  const json = pm.response.json();
  pm.expect(json.token).to.be.a("string");
  pm.environment.set("authToken", json.token);
});
```

---

### 6. تست و اتوماسیون

مجموعه ابزارهای تست برای اطمینان از صحت رفتار API:

- تست‌های Functional روی تک‌درخواست و Collection
- Assertionهای آماده در Snippets
- تست مبتنی بر قرارداد (Contract testing) با Spec
- اجرای خودکار در زمان ارسال دستی یا در Runner
- گزارش Pass / Fail برای هر تست
- استفاده مجدد از همان تست‌ها در CI بدون بازنویسی
- یکپارچگی با Mock برای تست قبل از آماده بودن بک‌اند واقعی

---

### 7. Collection Runner

ابزار اجرای دسته‌ای درخواست‌ها و تست‌ها.

- اجرای کل Collection یا بخشی از پوشه‌ها
- تعیین ترتیب و تعداد Iteration
- وارد کردن داده از CSV یا JSON برای Data-driven testing
- تأخیر بین درخواست‌ها (Delay)
- مشاهده نتایج زنده و گزارش نهایی
- ذخیره و مقایسه Runها
- اجرا در Desktop App و نیز از طریق CLI در pipeline

---

### 8. تست عملکرد و Load Testing

امکان بررسی عملکرد API تحت بار، با همان Collectionهایی که برای تست کارکردی استفاده می‌شوند.

- شبیه‌سازی کاربران همزمان (Virtual Users)
- اندازه‌گیری Latency، Throughput و نرخ خطا
- اجرای Load Test در محیط توسعه و در CI
- شناسایی گلوگاه‌ها قبل از production
- گزارش‌های مقایسه‌ای بین اجراها

---

### 9. Mock Server

ساخت سرورهای ساختگی بر اساس Exampleها یا Spec، بدون نیاز به بک‌اند واقعی.

- ایجاد Mock از روی Collection یا OpenAPI Spec
- پاسخ‌های ثابت یا پویا بر اساس Example
- شبیه‌سازی تأخیر و کدهای خطا
- استفاده در توسعه موازی Frontend / Backend
- آدرس عمومی یا خصوصی برای تیم
- یکپارچگی با Flows و تست‌های خودکار

---

### 10. طراحی API و مشخصات (API Design / Specs)

پشتیبانی از طراحی قراردادمحور (Contract-first) و مدیریت Spec.

- پشتیبانی از **OpenAPI (Swagger)**، **AsyncAPI**، **GraphQL SDL**، **Protobuf** و موارد مشابه
- ویرایش Spec داخل Postman
- تولید Collection از روی Spec و بالعکس
- اعتبارسنجی درخواست/پاسخ نسبت به Spec
- همگام‌سازی دوطرفه Spec با Collection
- نسخه‌بندی Specها همراه با کد در Git
- تعریف استانداردها و قوانین طراحی برای تیم

---

### 11. مستندسازی API (Documentation)

تولید و انتشار مستندات زنده از روی Collection و Spec.

- تولید خودکار Docs از توضیحات، پارامترها و Exampleها
- پیش‌نمایش Markdown
- انتشار مستندات عمومی یا خصوصی
- به‌روزرسانی خودکار با تغییر Collection
- کد نمونه در زبان‌های مختلف
- برندینگ و دامنه سفارشی (در پلن‌های بالاتر)
- امکان اشتراک لینک مستندات با مصرف‌کنندگان API

---

### 12. مانیتورینگ API

نظارت مستمر روی سلامت و عملکرد API در محیط‌های واقعی.

- زمان‌بندی اجرای Collection در فواصل مشخص
- مانیتور از مناطق جغرافیایی مختلف
- هشدار در صورت شکست تست یا کندی پاسخ
- یکپارچگی با ایمیل، Slack و ابزارهای اطلاع‌رسانی
- داشبورد تاریخچه Uptime، Latency و نرخ خطا
- مشاهده رفتار production در کنار تست‌های توسعه

---

### 13. Workspaces و همکاری تیمی

فضای مشترک برای کار تیمی روی APIها.

**انواع Workspace:**

- Personal
- Team
- Partner
- Public
- Project Workspaces مبتنی بر Git (نسخه‌های جدیدتر)

**قابلیت‌های همکاری:**

- اشتراک Collection، Environment، Mock، Monitor و Spec
- کنترل دسترسی (Role-based)
- کامنت‌گذاری و بحث روی درخواست‌ها و تغییرات
- همگام‌سازی real-time بین اعضای تیم
- مشاهده فعالیت‌ها و تغییرات دیگران
- دعوت اعضا و مدیریت نقش‌ها (Admin, Editor, Viewer و …)

> توجه: در پلن‌های جدید، همکاری تیمی عمدتاً در پلن‌های Team و Enterprise قرار دارد.

---

### 14. نسخه‌بندی و تاریخچه

ردیابی تغییرات و بازگشت به نسخه‌های قبلی.

- History درخواست‌های ارسال‌شده
- Version history برای Collection و عناصر دیگر
- Fork و Merge برای کار موازی روی Collection
- Pull Request داخلی (در برخی گردش‌کارها)
- مقایسه نسخه‌ها (Diff)
- امکان بازگردانی (Rollback) به نسخه پایدار

---

### 15. همگام‌سازی با Git

گردش‌کار Native Git برای نگه داشتن دارایی‌های API کنار کد.

- ذخیره Spec، Collection، Environment، Mock و تست‌ها در ریپوی Git
- کار روی Branch و Pull Request مشابه توسعه نرم‌افزار
- همگام‌سازی دوطرفه بین Postman و فایل‌سیستم / ریپو
- مرور تغییرات API همراه با تغییرات کد
- پشتیبانی از GitHub، GitLab، Bitbucket و ریپوهای سازگار
- کاهش فاصله بین «ابزار API» و «سورس کنترل»

---

### 16. Postman CLI و CI/CD

اتوماسیون اجرای تست‌ها و عملیات Postman در pipeline.

- اجرای Collection و تست‌ها از خط فرمان
- اجرای Mock و سناریوهای مرتبط در CI
- گزارش‌گیری برای ابزارهای CI (GitHub Actions، Jenkins، GitLab CI و …)
- استفاده از همان Collection محلی در محیط اتوماسیون
- انتشار و اعتبارسنجی در pipeline
- یکپارچگی با Newman (ابزار کلاسیک CLI مبتنی بر Node) در بسیاری از پروژه‌های موجود
- اجرای Performance Test در CI

---

### 17. Flows (اتوماسیون بصری)

ابزار low-code / visual برای ساخت workflowهای چندمرحله‌ای روی APIها.

- طراحی جریان با بلوک‌های بصری (درخواست، شرط، حلقه، تبدیل داده)
- اتصال چند API به هم بدون کدنویسی سنگین
- پردازش و تبدیل Response بین مراحل
- ساخت سناریوهای کسب‌وکار و orchestration
- اشتراک و اجرای Flows در تیم
- مناسب برای یکپارچه‌سازی سرویس‌ها و نمونه‌سازی سریع

---

### 18. امنیت، Governance و Secrets

کنترل‌های سازمانی برای امنیت و استانداردسازی API.

- مدیریت Secret و رمزنگاری مقادیر حساس
- نقش‌ها و دسترسی‌های دانه‌ریز (RBAC)
- SSO و یکپارچگی با Identity Providerهای سازمانی
- Audit Log برای ردیابی فعالیت‌ها
- قوانین Governance و Lint برای Spec/API
- اسکن انطباق (Compliance) در pipeline
- Private Network برای APIهای داخلی
- سیاست‌های اشتراک‌گذاری و جلوگیری از نشت داده
- پشتیبانی از الزامات امنیتی Enterprise

---

### 19. API Network و توزیع API

کشف، انتشار و مصرف API در مقیاس سازمان یا عمومی.

**Private API Network:**

- کاتالوگ داخلی APIهای سازمان
- مستندات، Sandbox، SDK و Workflow در یک جا
- کشف API مناسب بدون جستجوی پراکنده
- کنترل دسترسی مصرف‌کنندگان داخلی

**Public API Network:**

- انتشار API برای جامعه و شرکای خارجی
- صفحات عمومی برای کشف و امتحان API
- افزایش Visibility و Adoption

---

### 20. API Catalog

لایه عملیاتی و سیستم ثبت مرکزی برای پورتفوی API (از قابلیت‌های جدیدتر پلتفرم).

- نمای یکپارچه از APIها و سرویس‌های موجود
- نمایش Ownership، Spec، تست‌ها، فعالیت CI و وضعیت مانیتورینگ
- تشخیص اینکه کدام API تست‌شده، اتوماته‌شده و پایدار است
- کمک به رهبران مهندسی برای حاکمیت و مشاهده‌پذیری پورتفو

---

### 21. Interceptor و Proxy

گرفتن ترافیک واقعی مرورگر یا سیستم برای تبدیل به درخواست Postman.

- **Interceptor** (افزونه مرورگر): ضبط درخواست‌های مرورگر
- **Proxy** داخلی Postman: شنود ترافیک اپلیکیشن‌ها
- بازپخش و ویرایش درخواست‌های ضبط‌شده
- مفید برای دیباگ، مهندسی معکوس کنترل‌شده و ساخت سریع Collection از رفتار واقعی کلاینت
- مدیریت Cookieهای نشست مرورگر

---

### 22. Import / Export

ورود و خروج داده از/به فرمت‌های رایج.

**Import از:**

- OpenAPI / Swagger
- RAML
- WADL
- GraphQL Schema
- cURL
- HAR
- Collectionهای نسخه قدیمی Postman
- برخی فرمت‌های دیگر ابزارها (مثل Insomnia در سناریوهای مهاجرت)

**Export به:**

- Collection JSON
- Environment
- Spec
- فرمت‌های قابل استفاده در CLI و ابزارهای دیگر

---

### 23. احراز هویت (Authentication)

پشتیبانی از روش‌های متنوع Auth در سطح Request، Folder یا Collection.

- No Auth
- API Key
- Bearer Token
- Basic Auth
- Digest Auth
- OAuth 1.0 / OAuth 2.0
- Hawk
- AWS Signature
- NTLM
- Akamai EdgeGrid
- JWT (در سناریوهای مرتبط)
- مدیریت و تمدید خودکار توکن در OAuth 2.0 (بسته به پیکربندی)

---

### 24. Cookie Manager و Session

- مشاهده و مدیریت Cookieهای دامنه
- افزودن، ویرایش و حذف دستی Cookie
- حفظ Session بین درخواست‌ها
- هماهنگی با Interceptor برای Cookieهای مرورگر
- کنترل دقیق رفتار stateful در تست‌ها

---

### 25. Code Generation و SDK

- تولید کد کلاینت از روی درخواست در زبان‌هایی مثل JavaScript (fetch/axios)، Python, Java, C#, Go, PHP, Ruby, Swift, Shell/cURL و …
- کمک به انتقال سریع از «تست در Postman» به «کد در پروژه»
- انتشار یا اشتراک SDK در کنار مستندات (در سناریوهای Distribution)
- کاهش خطا در پیاده‌سازی دستی Header و Auth

---

### 26. Visualizer

نمایش بصری داده‌های Response با HTML/JS سفارشی.

- نوشتن قالب در تب Visualize
- ساخت جدول، نمودار و داشبورد کوچک از JSON پاسخ
- مناسب برای دمو، گزارش داخلی و تحلیل سریع داده API
- استفاده از `pm.visualizer.set()` در اسکریپت تست

---

### 27. پلن‌ها و سطح دسترسی

ساختار پلن‌ها در دوره‌های اخیر به سمت ساده‌سازی رفته است (تقریبی):

| پلن | مخاطب تقریبی |
|-----|----------------|
| **Free** | استفاده فردی محدود |
| **Solo** | توسعه‌دهنده فردی با امکانات بیشتر |
| **Team** | همکاری تیمی روی توسعه، تست و توزیع |
| **Enterprise** | سازمان‌ها با امنیت، Governance و مقیاس بالا |

قابلیت‌هایی مثل مانیتورینگ پیشرفته، RBAC کامل، SSO، Audit، Private Network و برخی add-onها معمولاً در پلن‌های بالاتر فعال‌اند. جزئیات دقیق را باید از صفحه قیمت‌گذاری رسمی Postman بررسی کرد چون تغییر می‌کند.

---

### 28. پلتفرم‌ها و دسترسی

- **Desktop App**: Windows، macOS، Linux
- **Web App**: کار در مرورگر
- **Mobile** (در صورت ارائه/وضعیت فعلی محصول): مشاهده و برخی تعاملات محدودتر
- همگام‌سازی ابری بین دستگاه‌ها (با حساب Postman)
- کار با Local files / Local servers در گردش‌کارهای Git-native جدیدتر

---

## جمع‌بندی چرخه عمر در Postman

Postman یک پلتفرم یکپارچه برای کل چرخه عمر API است، نه فقط یک ابزار ارسال Request:

```text
Design (Spec)
    → Mock
        → Develop & Debug (Client)
            → Test (Scripts / Runner / Load)
                → Automate (CLI / CI)
                    → Document & Distribute (Docs / Network)
                        → Monitor & Govern (Monitors / Catalog / Security)
```

---

## منابع رسمی برای به‌روزرسانی

- [صفحه محصول Postman](https://www.postman.com/product/)
- [New Postman](https://www.postman.com/new-postman/)
- [مستندات یادگیری Postman](https://learning.postman.com/docs/)
- [بلاگ قابلیت‌های جدید](https://blog.postman.com/)

---

*این سند بر اساس امکانات شناخته‌شده و اعلام‌شده پلتفرم Postman تهیه شده است. برخی ویژگی‌ها وابسته به پلن هستند و ممکن است با به‌روزرسانی‌های محصول تغییر کنند.*
