// ============================================
// Страница донатов - JavaScript с корзиной
// ============================================

let selectedProjects = [];
let useCustomAmount = false;
let projectsData = [];

// Ключ для localStorage корзины
const CART_KEY = 'donate_cart';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    await API.initDefaultData();
    await loadProjectsForDonate();
    loadCartFromStorage();
    updateCartUI();
    
    // Проверяем, есть ли выбранный проект из projects.html
    const selectedProjectId = sessionStorage.getItem('selectedProjectId');
    if (selectedProjectId) {
        setTimeout(() => {
            const projectElement = document.querySelector(`.project-item[data-id="${selectedProjectId}"]`);
            if (projectElement) {
                toggleProject(projectElement);
            }
            sessionStorage.removeItem('selectedProjectId');
        }, 100);
    }
});

// ============================================
// КОРЗИНА — localStorage
// ============================================

// Загрузить корзину из localStorage
function loadCartFromStorage() {
    const cart = LocalStorageDB.get(CART_KEY) || [];
    selectedProjects = cart.map(item => ({
        id: item.id,
        amount: item.amount,
        name: item.name,
        image: item.image
    }));
    updateDonateSummary();
}

// Сохранить корзину в localStorage
function saveCartToStorage() {
    const cart = selectedProjects.map(p => ({
        id: p.id,
        amount: p.amount,
        name: p.name,
        image: p.image
    }));
    LocalStorageDB.set(CART_KEY, cart);
}

// Добавить в корзину
function addToCart(projectId, amount, name, image) {
    const existing = selectedProjects.find(p => p.id === projectId);
    if (!existing) {
        selectedProjects.push({ id: projectId, amount, name, image });
        saveCartToStorage();
        updateCartUI();
        updateDonateSummary();
        showNotification('Проект добавлен в корзину!', 'success');
    }
}

// Удалить из корзины
function removeFromCart(projectId) {
    selectedProjects = selectedProjects.filter(p => p.id !== projectId);
    
    // Обновляем UI проектов
    const projectEl = document.querySelector(`.project-item[data-id="${projectId}"]`);
    if (projectEl) {
        projectEl.classList.remove('selected');
    }
    
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

// Очистить корзину
function clearCart() {
    selectedProjects = [];
    document.querySelectorAll('.project-item').forEach(p => p.classList.remove('selected'));
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

// Обновить UI корзины
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cartCount) cartCount.textContent = selectedProjects.length;
    
    if (selectedProjects.length === 0) {
        if (cartItems) cartItems.innerHTML = '<div class="donate-cart-empty"><i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 10px; display: block; color: var(--text-muted);"></i>Корзина пуста</div>';
        if (cartTotal) cartTotal.textContent = 'Итого: 0 руб.';
        return;
    }
    
    let total = 0;
    if (cartItems) {
        cartItems.innerHTML = selectedProjects.map(p => {
            total += p.amount;
            return `
                <div class="donate-cart-item">
                    <span><i class="fas fa-check-circle" style="color: var(--accent-pink); margin-right: 5px;"></i>${p.name || 'Проект #' + p.id}</span>
                    <span>
                        ${p.amount.toLocaleString('ru-RU')} руб.
                        <button class="donate-cart-remove" onclick="removeFromCart(${p.id})" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>
                    </span>
                </div>
            `;
        }).join('');
    }
    
    if (cartTotal) cartTotal.textContent = `Итого: ${total.toLocaleString('ru-RU')} руб.`;
}

// Показать/скрыть корзину
function toggleCart() {
    const dropdown = document.getElementById('cartDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Оформить корзину
function checkoutCart() {
    if (selectedProjects.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    toggleCart();
    processPayment();
}

// ============================================
// ЗАГРУЗКА ПРОЕКТОВ
// ============================================

async function loadProjectsForDonate() {
    try {
        projectsData = await API.getProjects();
        
        const availableProjects = projectsData.filter(p => p.status !== 'completed');
        
        const container = document.getElementById('projectsContainer');
        if (!container) return;
        
        if (availableProjects.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Нет доступных проектов для пожертвований</p>';
            return;
        }
        
        const displayProjects = availableProjects.slice(0, 4);
        
        container.innerHTML = displayProjects.map(project => {
            const isSelected = selectedProjects.some(p => p.id === project.id);
            return `
                <div class="project-item ${isSelected ? 'selected' : ''}" data-id="${project.id}" data-amount="${project.donation_amount}" data-name="${project.name}" data-image="${project.image}" onclick="toggleProject(this)">
                    <img src="${project.image}" alt="${project.name}">
                    <div class="project-item-overlay">${project.name}</div>
                    <div class="project-checkbox">✓</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading projects for donate:', error);
    }
}

// ============================================
// ВЫБОР ПРОЕКТОВ
// ============================================

function toggleProject(element) {
    if (useCustomAmount) {
        useCustomAmount = false;
        document.getElementById('customAmountSection').classList.remove('active');
        document.getElementById('customAmount').value = '';
    }
    
    const id = parseInt(element.dataset.id);
    const amount = parseInt(element.dataset.amount);
    const name = element.dataset.name;
    const image = element.dataset.image;
    
    element.classList.toggle('selected');
    
    if (element.classList.contains('selected')) {
        // Удаляем дубликат если есть и добавляем
        selectedProjects = selectedProjects.filter(p => p.id !== id);
        selectedProjects.push({ id, amount, name, image });
    } else {
        selectedProjects = selectedProjects.filter(p => p.id !== id);
    }
    
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

function enableCustomAmount() {
    useCustomAmount = true;
    
    selectedProjects = [];
    document.querySelectorAll('.project-item').forEach(p => p.classList.remove('selected'));
    
    document.getElementById('customAmountSection').classList.add('active');
    document.getElementById('customAmount').focus();
    
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

function updateDonateSummary() {
    let total = 0;
    
    if (useCustomAmount) {
        const customAmount = parseInt(document.getElementById('customAmount').value) || 0;
        total = customAmount;
    } else {
        total = selectedProjects.reduce((sum, p) => sum + p.amount, 0);
    }
    
    document.getElementById('donateAmount').textContent = total.toLocaleString('ru-RU');
}

// ============================================
// МОДАЛЬНОЕ ОКНО ВСЕХ ПРОЕКТОВ
// ============================================

function showAllProjectsModal() {
    const modal = new bootstrap.Modal(document.getElementById('allProjectsModal'));
    const grid = document.getElementById('allProjectsGrid');
    
    const availableProjects = projectsData.filter(p => p.status !== 'completed');
    
    grid.innerHTML = availableProjects.map(project => {
        const isSelected = selectedProjects.some(p => p.id === project.id);
        return `
            <div class="col-md-6 mb-3">
                <div class="project-item ${isSelected ? 'selected' : ''}" 
                     data-id="${project.id}" 
                     data-amount="${project.donation_amount}"
                     data-name="${project.name}"
                     data-image="${project.image}"
                     onclick="toggleProjectInModal(this)"
                     style="position: relative;">
                    <img src="${project.image}" alt="${project.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
                    <div class="project-item-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 15px; color: white; border-radius: 0 0 10px 10px;">
                        ${project.name}
                    </div>
                    <div class="project-checkbox" style="opacity: ${isSelected ? '1' : '0'};">✓</div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.show();
}

function toggleProjectInModal(element) {
    const id = parseInt(element.dataset.id);
    const amount = parseInt(element.dataset.amount);
    const name = element.dataset.name;
    const image = element.dataset.image;
    
    element.classList.toggle('selected');
    const checkbox = element.querySelector('.project-checkbox');
    checkbox.style.opacity = element.classList.contains('selected') ? '1' : '0';
    
    if (element.classList.contains('selected')) {
        selectedProjects = selectedProjects.filter(p => p.id !== id);
        selectedProjects.push({ id, amount, name, image });
    } else {
        selectedProjects = selectedProjects.filter(p => p.id !== id);
    }
    
    // Обновляем основной список
    const mainElement = document.querySelector(`#projectsContainer .project-item[data-id="${id}"]`);
    if (mainElement) {
        if (element.classList.contains('selected')) {
            mainElement.classList.add('selected');
        } else {
            mainElement.classList.remove('selected');
        }
    }
    
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

// ============================================
// ОПЛАТА
// ============================================

function processPayment() {
    const amount = parseInt(document.getElementById('donateAmount').textContent.replace(/\s/g, ''));
    
    if (amount <= 0) {
        showNotification('Пожалуйста, выберите проект или введите сумму', 'error');
        return;
    }
    
    if (useCustomAmount && amount < 100) {
        showNotification('Минимальная сумма пожертвования - 100 руб.', 'error');
        return;
    }
    
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', 'donate.html');
        window.location.href = 'login.html';
        return;
    }
    
    showPaymentSimulation(amount);
}

function showPaymentSimulation(amount) {
    const simulation = document.getElementById('paymentSimulation');
    const processing = document.getElementById('paymentProcessing');
    const success = document.getElementById('paymentSuccess');
    
    document.getElementById('paymentAmount').textContent = amount.toLocaleString('ru-RU');
    
    simulation.classList.add('active');
    processing.style.display = 'block';
    success.style.display = 'none';
    
    setTimeout(async () => {
        processing.style.display = 'none';
        success.style.display = 'block';
        
        await saveDonation(amount);
    }, 2000);
}

function closePaymentSimulation() {
    document.getElementById('paymentSimulation').classList.remove('active');
    
    selectedProjects = [];
    useCustomAmount = false;
    document.querySelectorAll('.project-item').forEach(p => p.classList.remove('selected'));
    document.getElementById('customAmountSection').classList.remove('active');
    document.getElementById('customAmount').value = '';
    
    saveCartToStorage();
    updateCartUI();
    updateDonateSummary();
}

async function saveDonation(amount) {
    try {
        if (useCustomAmount) {
            await API.createDonation({
                user_id: AppState.currentUser.id,
                project_id: null,
                amount: amount,
                status: 'completed'
            });
        } else {
            for (const project of selectedProjects) {
                await API.createDonation({
                    user_id: AppState.currentUser.id,
                    project_id: project.id,
                    amount: project.amount,
                    status: 'completed'
                });
            }
        }
        
        const updatedUser = await API.getUser(AppState.currentUser.id);
        if (updatedUser) {
            LocalStorageDB.set('currentUser', updatedUser);
            AppState.currentUser = updatedUser;
        }
        
        // Очищаем корзину после успешной оплаты
        clearCart();
        
    } catch (error) {
        console.error('Error saving donation:', error);
        showNotification('Ошибка при сохранении пожертвования', 'error');
    }
}

// ============================================
// УВЕДОМЛЕНИЯ
// ============================================

function showNotification(message, type) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 15px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideInRight 0.4s ease;
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.4s ease reverse';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Слушатель изменения произвольной суммы
document.addEventListener('input', function(e) {
    if (e.target.id === 'customAmount') {
        updateDonateSummary();
    }
});

// Закрытие корзины при клике вне её
document.addEventListener('click', function(e) {
    const cart = document.getElementById('donateCart');
    const dropdown = document.getElementById('cartDropdown');
    if (cart && dropdown && !cart.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});
