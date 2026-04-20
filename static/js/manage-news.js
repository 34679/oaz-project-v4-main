// ============================================
// Управление новостями (Админ) - JavaScript
// ============================================

let allNewsData = [];
let editingNewsId = null;

// Загрузка списка новостей с фильтрами
async function loadNewsList() {
    try {
        const container = document.getElementById('newsList');
        container.innerHTML = '<p style="text-align: center; color: #666;">Загрузка...</p>';
        
        allNewsData = await API.getNews();
        applyNewsFilters();
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('newsList').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">Ошибка при загрузке новостей</p>';
    }
}

// Применить фильтры и сортировку
function applyNewsFilters() {
    const searchQuery = (document.getElementById('newsSearchInput').value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('newsCategoryFilter').value;
    const sortValue = document.getElementById('newsSortFilter').value;
    
    let filtered = [...allNewsData];
    
    // Фильтр по поиску
    if (searchQuery) {
        filtered = filtered.filter(item => 
            (item.title || '').toLowerCase().includes(searchQuery) ||
            (item.description || '').toLowerCase().includes(searchQuery) ||
            (item.content || '').toLowerCase().includes(searchQuery)
        );
    }
    
    // Фильтр по категории
    if (categoryFilter) {
        filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Сортировка
    filtered.sort((a, b) => {
        switch (sortValue) {
            case 'date-asc':
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            case 'date-desc':
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            case 'title-asc':
                return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
                return (b.title || '').localeCompare(a.title || '');
            default:
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
    });
    
    renderNewsList(filtered);
}

// Отрисовка списка новостей
function renderNewsList(news) {
    const container = document.getElementById('newsList');
    
    if (news.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Нет новостей по выбранным фильтрам</p>';
        return;
    }
    
    const categoryLabels = {
        'news': 'Новость',
        'work': 'Проделанная работа',
        'help': 'Помощь'
    };
    
    container.innerHTML = news.map(item => {
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '';
        const categoryText = categoryLabels[item.category] || item.category || 'Без категории';
        
        return `
            <div class="news-admin-card" style="background: var(--card-bg); border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 3px 15px var(--shadow-color); border: 2px solid var(--border-color); transition: all 0.3s; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--black); font-size: 1.1rem; font-weight: bold;">${item.title}</h4>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">
                        <span style="background: var(--light-blue); padding: 3px 10px; border-radius: 10px; margin-right: 10px; font-size: 0.8rem;">${categoryText}</span>
                        ${dateStr}
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editNews(${item.id})" style="background: var(--primary-blue); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button onclick="deleteNewsById(${item.id})" style="background: var(--accent-pink); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Показать модальное окно добавления
function showAddNewsModal() {
    editingNewsId = null;
    document.getElementById('modalTitle').textContent = 'Добавить новость';
    document.getElementById('newsForm').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('newsModal').style.display = 'flex';
}

// Закрыть модальное окно
function closeNewsModal() {
    document.getElementById('newsModal').style.display = 'none';
}

// Редактирование новости
async function editNews(newsId) {
    try {
        const item = await API.getNewsItem(newsId);
        if (!item) {
            alert('Новость не найдена');
            return;
        }
        
        editingNewsId = newsId;
        document.getElementById('modalTitle').textContent = 'Редактировать новость';
        document.getElementById('newsId').value = item.id;
        document.getElementById('newsTitle').value = item.title || '';
        document.getElementById('newsDescription').value = item.description || '';
        document.getElementById('newsContent').value = item.content || '';
        document.getElementById('newsCategory').value = item.category || 'news';
        document.getElementById('newsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading news for edit:', error);
        alert('Ошибка при загрузке новости');
    }
}

// Сохранение новости
async function saveNews(event) {
    event.preventDefault();
    
    const newsData = {
        title: document.getElementById('newsTitle').value.trim(),
        description: document.getElementById('newsDescription').value.trim(),
        content: document.getElementById('newsContent').value.trim(),
        category: document.getElementById('newsCategory').value,
        image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400',
        created_at: new Date().toISOString()
    };
    
    if (!newsData.title || !newsData.content) {
        alert('Заполните обязательные поля');
        return;
    }
    
    try {
        if (editingNewsId) {
            await API.updateNews(editingNewsId, newsData);
            alert('Новость обновлена!');
        } else {
            await API.createNews(newsData);
            alert('Новость добавлена!');
        }
        
        closeNewsModal();
        await loadNewsList();
    } catch (error) {
        console.error('Error saving news:', error);
        alert('Ошибка при сохранении новости');
    }
}

// Удаление новости
async function deleteNewsById(newsId) {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
    
    try {
        await API.deleteNews(newsId);
        await loadNewsList();
        alert('Новость удалена!');
    } catch (error) {
        console.error('Error deleting news:', error);
        alert('Ошибка при удалении новости');
    }
}
