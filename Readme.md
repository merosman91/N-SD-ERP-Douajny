poultry-erp/
├── index.html              # نقطة الدخول الرئيسية
├── manifest.json           # ملف PWA
├── service-worker.js       # Service Worker
├── robots.txt
├── .gitignore
├── README.md
├── package.json
│
├── src/
│   ├── main.js             # نقطة الدخول لتطبيق JS
│   ├── config.js           # إعدادات التطبيق
│   ├── router.js           # نظام التوجيه
│   ├── state.js            # إدارة الحالة المركزية
│   ├── db.js               # IndexedDB
│   ├── analytics-engine.js # محرك التحليلات
│   │
│   ├── core/
│   │   ├── auth.js         # نظام المصادقة
│   │   ├── notifications.js # نظام الإشعارات
│   │   ├── utils.js        # دوال مساعدة
│   │   └── validators.js   # التحقق من البيانات
│   │
│   ├── modules/
│   │   ├── dashboard/
│   │   │   ├── index.js    # لوحة التحكم
│   │   │   ├── kpi-cards.js
│   │   │   └── charts.js
│   │   │
│   │   ├── flocks/
│   │   │   ├── index.js    # إدارة الدفعات
│   │   │   ├── add-flock.js
│   │   │   └── flock-details.js
│   │   │
│   │   ├── inventory/
│   │   │   ├── index.js    # إدارة المخزون المتقدم
│   │   │   ├── stock-manager.js
│   │   │   ├── procurement.js # المشتريات
│   │   │   └── inventory-db.js
│   │   │
│   │   ├── finance/
│   │   │   ├── index.js    # الإدارة المالية
│   │   │   ├── expenses.js # المصروفات
│   │   │   ├── revenue.js  # الإيرادات
│   │   │   ├── budget.js   # الميزانية
│   │   │   └── reports.js  # التقارير المالية
│   │   │
│   │   ├── environment/
│   │   │   ├── index.js    # مراقبة البيئة
│   │   │   └── sensors.js  # محاكاة المستشعرات
│   │   │
│   │   ├── health/
│   │   │   ├── index.js    # السجل الصحي
│   │   │   └── vaccinations.js
│   │   │
│   │   ├── quality/
│   │   │   ├── index.js    # إدارة الجودة
│   │   │   ├── feed-quality.js
│   │   │   └── compliance.js
│   │   │
│   │   └── reports/
│   │       ├── index.js    # التقارير الذكية
│   │       ├── flock-report.js
│   │       ├── financial-report.js
│   │       └── export.js   # تصدير التقارير
│   │
│   ├── components/
│   │   ├── header.js       # شريط العنوان
│   │   ├── navigation.js   # التنقل
│   │   ├── cards.js        # البطاقات
│   │   ├── charts.js       # الرسوم البيانية
│   │   ├── modals.js       # النوافذ المنبثقة
│   │   └── forms.js        # النماذج
│   │
│   ├── styles/
│   │   ├── main.css        # الأنماط الرئيسية
│   │   ├── components.css  # أنماط المكونات
│   │   ├── responsive.css  # التصميم المتجاوب
│   │   └── themes.css      # السمات (داكن/فاتح)
│   │
│   └── assets/
│       ├── icons/          # الأيقونات
│       └── fonts/          # الخطوط
│
├── public/                 # الملفات العامة
│   ├── favicon.ico
│   └── icon-192.png
│
└── docs/                  # التوثيق
    ├── api.md
    ├── development.md
    └── deployment.md 
