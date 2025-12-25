import { appState, updateState, loadState, saveState } from '../state.js';
import { router, navigateTo } from '../router.js';

export function initializeApp() {
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }, 1000);
    
    // تحميل حالة التطبيق
    loadState().then(() => {
        console.log('🚀 التطبيق جاهز');
        
        // التحقق من تسجيل الدخول
        const isLoggedIn = localStorage.getItem('poultry_login') === 'true';
        
        if (!isLoggedIn) {
            showLoginScreen();
        } else {
            showMainApp();
        }
    });
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    
    // إضافة مستمع للأحداث لتسجيل الدخول
    document.getElementById('pinInput')?.addEventListener('input', function(e) {
        if (this.value.length === 4) {
            attemptLogin();
        }
    });
    
    document.getElementById('pinInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.length === 4) {
            attemptLogin();
        }
    });
}

function attemptLogin() {
    const pinInput = document.getElementById('pinInput');
    const pin = pinInput?.value;
    
    if (pin === '1234') {
        localStorage.setItem('poultry_login', 'true');
        showMainApp();
    } else {
        alert('رمز الدخول غير صحيح!');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
    }
}

function showMainApp() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    
    // تحديث حالة التطبيق
    updateState({ isLoggedIn: true });
    
    // تحديث واجهة المستخدم
    updateHeader();
    updateNavigation();
    
    // بدء التوجيه
    const hash = window.location.hash.substring(1) || 'dashboard';
    const [route, ...params] = hash.split('/');
    
    navigateTo(route, params);
}

function updateHeader() {
    const header = document.getElementById('appHeader');
    if (!header) return;
    
    header.innerHTML = `
        <div class="header-left">
            <h1 id="headerTitle">لوحة التحكم</h1>
        </div>
        <div class="header-actions">
            <button onclick="navigateTo('notifications')" class="btn-icon" id="notificationsBtn">
                <i class="fas fa-bell"></i>
                <span class="badge" id="notificationBadge"></span>
            </button>
            <button onclick="navigateTo('settings')" class="btn-icon">
                <i class="fas fa-cog"></i>
            </button>
        </div>
    `;
}

function updateNavigation() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    
    nav.innerHTML = `
        <a href="#" data-route="dashboard" class="nav-item">
            <i class="fas fa-home"></i>
            <span>الرئيسية</span>
        </a>
        
        <a href="#" data-route="flocks" class="nav-item">
            <i class="fas fa-dove"></i>
            <span>الدفعات</span>
        </a>
        
        <a href="#" data-route="inventory" class="nav-item">
            <i class="fas fa-box"></i>
            <span>المخزون</span>
        </a>
        
        <button onclick="addQuickAction()" class="nav-add-btn">
            <i class="fas fa-plus"></i>
        </button>
        
        <a href="#" data-route="finance" class="nav-item">
            <i class="fas fa-money-bill-wave"></i>
            <span>المالية</span>
        </a>
        
        <a href="#" data-route="reports" class="nav-item">
            <i class="fas fa-chart-line"></i>
            <span>التقارير</span>
        </a>
        
        <a href="#" data-route="environment" class="nav-item">
            <i class="fas fa-temperature-half"></i>
            <span>البيئة</span>
        </a>
    `;
    
    // إضافة مستمعي الأحداث للتنقل
    nav.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const route = this.getAttribute('data-route');
            if (route) {
                navigateTo(route);
            }
        });
    });
}

function addQuickAction() {
    const actions = [
        { route: 'add-flock', icon: 'dove', label: 'دفعة جديدة' },
        { route: 'add-inventory', icon: 'box', label: 'إضافة مخزون' },
        { route: 'add-transaction', icon: 'money-bill', label: 'معاملة مالية' },
        { route: 'add-check', icon: 'clipboard-check', label: 'فحص جودة' }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay fade-in';
    modal.innerHTML = `
        <div class="modal-content slide-up">
            <div class="modal-header">
                <h3>إجراء سريع</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="quick-actions-grid">
                    ${actions.map(action => `
                        <button onclick="navigateTo('${action.route}')" class="quick-action-btn">
                            <div class="action-icon">
                                <i class="fas fa-${action.icon}"></i>
                            </div>
                            <span>${action.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// جعل الدوال متاحة عالمياً
window.navigateTo = navigateTo;
window.addQuickAction = addQuickAction;

// تحديث شارة الإشعارات
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = appState.state.notifications?.filter(n => !n.read).length || 0;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// تحديث شارة الإشعارات عند تغيير الحالة
appState.subscribe((state, oldState) => {
    if (state.notifications !== oldState.notifications) {
        updateNotificationBadge();
    }
});

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker مسجل:', registration.scope);
            })
            .catch(error => {
                console.log('❌ فشل تسجيل Service Worker:', error);
            });
    });
}
