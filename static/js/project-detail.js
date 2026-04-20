// ============================================
// Детали проекта - JavaScript
// ============================================

let currentProject = null;
let currentProjectId = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = parseInt(urlParams.get('id'));
    
    if (!currentProjectId) {
        window.location.href = 'projects.html';
        return;
    }
    
    await loadProjectDetails();
    await loadProjectComments();
    setupCommentForm();
});

// Загрузка деталей проекта
async function loadProjectDetails() {
    try {
        currentProject = await API.getProject(currentProjectId);
        
        if (!currentProject) {
            alert('Проект не найден');
            window.location.href = 'projects.html';
            return;
        }
        
        // Заполняем информацию
        const imgEl = document.getElementById('projectImage');
        if (imgEl) {
            imgEl.src = currentProject.image || '/static/images/project-default.jpg';
            imgEl.alt = currentProject.name || 'Проект';
        }
        
        const titleEl = document.getElementById('projectTitle');
        if (titleEl) titleEl.textContent = currentProject.name || 'Без названия';
        
        const descEl = document.getElementById('projectDescription');
        if (descEl) descEl.textContent = currentProject.description || 'Описание отсутствует';
        
        const fullDescEl = document.getElementById('projectFullDescription');
        if (fullDescEl) fullDescEl.innerHTML = currentProject.full_description || currentProject.description || '';
        
        // Даты
        const startDateEl = document.getElementById('projectStartDate');
        if (startDateEl) startDateEl.textContent = formatDate(currentProject.start_date);
        
        const endDateEl = document.getElementById('projectEndDate');
        if (endDateEl) endDateEl.textContent = formatDate(currentProject.end_date);
        
        // Часы
        const hoursEl = document.getElementById('projectHours');
        if (hoursEl) hoursEl.textContent = `${currentProject.total_hours || 0} ч.`;
        
        // Участники
        const participants = currentProject.participants || { volunteers: 0, donors: 0 };
        const totalParticipants = (participants.volunteers || 0) + (participants.donors || 0);
        const participantsEl = document.getElementById('projectParticipants');
        if (participantsEl) participantsEl.textContent = totalParticipants;
        
        // Прогресс
        const collected = currentProject.collected_amount || 0;
        const target = currentProject.target_amount || 1;
        const progress = Math.min(100, Math.round((collected / target) * 100));
        const progressEl = document.getElementById('projectProgress');
        if (progressEl) progressEl.style.width = `${progress}%`;
        
        const amountsEl = document.getElementById('projectAmounts');
        if (amountsEl) amountsEl.textContent = `${collected.toLocaleString('ru-RU')} / ${target.toLocaleString('ru-RU')} руб.`;
        
        // Статус
        const statusMap = {
            'active': 'Текущий',
            'planned': 'Запланирован',
            'completed': 'Завершен'
        };
        const statusText = statusMap[currentProject.status] || currentProject.status || 'Неизвестно';
        const statusBadge = document.getElementById('projectStatus');
        if (statusBadge) {
            statusBadge.textContent = statusText;
            statusBadge.className = `status-badge status-${currentProject.status || 'active'}`;
        }
        
        // Обновляем кнопки
        await updateActionButtons();
    } catch (error) {
        console.error('Error loading project details:', error);
        document.getElementById('projectTitle').textContent = 'Ошибка загрузки';
        document.getElementById('projectDescription').textContent = 'Не удалось загрузить информацию о проекте. Попробуйте позже.';
    }
}

// Настройка формы комментариев
function setupCommentForm() {
    const commentForm = document.getElementById('projectCommentForm');
    const loginPrompt = document.getElementById('projectLoginPrompt');
    
    if (!commentForm || !loginPrompt) return;
    
    if (AppState.currentUser) {
        commentForm.style.display = 'block';
        loginPrompt.style.display = 'none';
    } else {
        commentForm.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

// Загрузка комментариев к проекту
async function loadProjectComments() {
    const commentsList = document.getElementById('projectCommentsList');
    if (!commentsList) return;
    
    try {
        const comments = await API.getComments(currentProjectId);
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px;">Пока нет комментариев. Будьте первым!</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => {
            const authorName = comment.first_name && comment.last_name 
                ? `${comment.first_name} ${comment.last_name}`
                : (comment.author || 'Аноним');
            const dateStr = formatDateTime(comment.created_at);
            
            return `
                <div class="comment-item" style="background: var(--card-bg); border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 3px 15px var(--shadow-color); border: 2px solid var(--border-color); animation: slideUp 0.4s ease forwards; transition: all 0.3s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div class="comment-author" style="font-weight: bold; color: var(--primary-blue); font-size: 1rem;">
                            <i class="fas fa-user-circle"></i> ${authorName}
                        </div>
                        <div class="comment-date" style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</div>
                    </div>
                    <div class="comment-text" style="color: var(--text-secondary); line-height: 1.6; font-size: 1rem;">${comment.content || comment.text || ''}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading project comments:', error);
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px;">Ошибка при загрузке комментариев</p>';
    }
}

// Добавление комментария к проекту
async function addProjectComment() {
    if (!AppState.currentUser) {
        alert('Пожалуйста, войдите в систему, чтобы оставить комментарий');
        return;
    }
    
    const textarea = document.getElementById('projectCommentText');
    if (!textarea) return;
    
    const text = textarea.value.trim();
    if (!text) {
        alert('Введите текст комментария');
        return;
    }
    
    try {
        await API.createComment(currentProjectId, AppState.currentUser.id, text);
        textarea.value = '';
        await loadProjectComments();
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Ошибка при добавлении комментария');
    }
}

// Обновление кнопок действий
async function updateActionButtons() {
    const joinBtn = document.getElementById('joinBtn');
    const donateBtn = document.getElementById('donateBtn');
    
    if (!joinBtn || !donateBtn) return;
    
    // Если проект завершен - отключаем кнопки
    if (currentProject.status === 'completed') {
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-check-circle"></i> Проект завершен';
        joinBtn.style.opacity = '0.6';
        joinBtn.style.cursor = 'not-allowed';
        donateBtn.disabled = true;
        donateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Проект завершен';
        donateBtn.style.opacity = '0.6';
        donateBtn.style.cursor = 'not-allowed';
        return;
    }
    
    // Проверяем, присоединился ли пользователь
    if (AppState.currentUser) {
        try {
            const participation = await API.checkParticipation(currentProjectId, AppState.currentUser.id);
            if (participation && participation.is_joined) {
                joinBtn.disabled = true;
                joinBtn.innerHTML = '<i class="fas fa-user-check"></i> Вы участвуете';
                joinBtn.style.opacity = '0.6';
                joinBtn.style.cursor = 'not-allowed';
            }
        } catch (e) {
            // ignore
        }
    }
}

// Обработка присоединения к проекту
function handleJoinProject() {
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', `project-detail.html?id=${currentProjectId}`);
        window.location.href = 'login.html';
        return;
    }
    
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) {
        // Если нет модалки, сразу присоединяемся
        joinProject();
        return;
    }
    
    const modal = new bootstrap.Modal(modalEl);
    const msgEl = document.getElementById('confirmMessage');
    if (msgEl) {
        msgEl.textContent = `Вы уверены, что хотите присоединиться к проекту "${currentProject?.name || ''}"?`;
    }
    
    const confirmBtn = document.getElementById('confirmActionBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async function() {
            await joinProject();
            modal.hide();
        };
    }
    
    modal.show();
}

// Присоединение к проекту
async function joinProject() {
    try {
        let role = 'volunteer';
        if (AppState.currentUser.is_donor && !AppState.currentUser.is_volunteer) {
            role = 'donor';
        }
        
        await API.joinProject(currentProjectId, AppState.currentUser.id, role);
        
        const participants = LocalStorageDB.get('project_participants') || [];
        participants.push({
            project_id: currentProjectId,
            user_id: AppState.currentUser.id,
            role: role,
            hours_contributed: 0,
            amount_donated: 0,
            joined_at: new Date().toISOString()
        });
        LocalStorageDB.set('project_participants', participants);
        
        alert('Вы успешно присоединились к проекту!');
        await loadProjectDetails();
    } catch (error) {
        console.error('Error joining project:', error);
        alert('Ошибка при присоединении к проекту');
    }
}

// Обработка доната
function handleDonateProject() {
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', `project-detail.html?id=${currentProjectId}`);
        window.location.href = 'login.html';
        return;
    }
    
    sessionStorage.setItem('selectedProjectId', currentProjectId);
    window.location.href = 'donate.html';
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('ru-RU');
    } catch {
        return '-';
    }
}

// Форматирование даты и времени
function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
}

// donateToProject для обратной совместимости
function donateToProject() {
    handleDonateProject();
}
