# Схема базы данных ОАЗ

## Общая информация

База данных SQLite для проекта "Океанский Альянс Защиты" (ОАЗ)

---

## Сущности и атрибуты

### 1. USERS (Пользователи)

Хранит информацию о зарегистрированных пользователях.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| first_name | TEXT NOT NULL | Имя пользователя |
| last_name | TEXT NOT NULL | Фамилия пользователя |
| email | TEXT UNIQUE NOT NULL | Email (уникальный) |
| password | TEXT NOT NULL | Пароль |
| role | TEXT DEFAULT 'user' | Роль: user, volunteer, donor, volunteer_donor, admin |
| is_volunteer | INTEGER DEFAULT 0 | Флаг волонтера (0/1) |
| is_donor | INTEGER DEFAULT 0 | Флаг благотворителя (0/1) |
| created_at | TIMESTAMP | Дата регистрации |

**Связи:**
- Один пользователь может участвовать в многих проектах (через PROJECT_PARTICIPANTS)
- Один пользователь может делать много донатов (через DONATIONS)

---

### 2. PROJECTS (Проекты)

Основная сущность - хранит информацию обо всех проектах организации.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| name | TEXT NOT NULL | Название проекта |
| description | TEXT NOT NULL | Краткое описание |
| full_description | TEXT | Полное описание |
| image | TEXT | URL изображения |
| start_date | DATE NOT NULL | Дата начала |
| end_date | DATE NOT NULL | Дата окончания |
| status | TEXT DEFAULT 'planned' | Статус: planned, active, completed |
| target_amount | INTEGER NOT NULL | Целевая сумма (руб) |
| collected_amount | INTEGER DEFAULT 0 | Накопленная сумма (руб) |
| donation_amount | INTEGER DEFAULT 2500 | Стоимость одного взноса |
| total_hours | INTEGER DEFAULT 0 | Общее количество часов |
| manager_id | INTEGER | ID руководителя проекта |
| created_at | TIMESTAMP | Дата создания |
| updated_at | TIMESTAMP | Дата обновления |

**Статусы проекта:**
- `planned` - Запланирован (start_date > текущая дата)
- `active` - Текущий (start_date <= текущая дата <= end_date)
- `completed` - Завершен (end_date < текущая дата)

**Связи:**
- Один проект имеет много участников (через PROJECT_PARTICIPANTS)
- Один проект может иметь много новостей
- Один проект может получать много донатов

---

### 3. PROJECT_PARTICIPANTS (Участники проектов)

Связующая таблица many-to-many между пользователями и проектами.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| project_id | INTEGER NOT NULL | ID проекта |
| user_id | INTEGER NOT NULL | ID пользователя |
| role | TEXT DEFAULT 'volunteer' | Роль в проекте: volunteer, donor |
| hours_contributed | INTEGER DEFAULT 0 | Внесенные часы |
| amount_donated | INTEGER DEFAULT 0 | Внесенная сумма |
| joined_at | TIMESTAMP | Дата присоединения |

**Ограничения:**
- UNIQUE(project_id, user_id, role) - один пользователь может быть в проекте один раз в каждой роли

**Связи:**
- FOREIGN KEY (project_id) → PROJECTS(id)
- FOREIGN KEY (user_id) → USERS(id)

---

### 4. NEWS (Новости)

Хранит новости и обновления по проектам.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| project_id | INTEGER | ID проекта (может быть NULL) |
| title | TEXT NOT NULL | Заголовок |
| description | TEXT NOT NULL | Краткое описание |
| content | TEXT NOT NULL | Полный текст |
| image | TEXT | URL изображения |
| category | TEXT DEFAULT 'news' | Категория: news, work, help |
| created_at | TIMESTAMP | Дата создания |
| updated_at | TIMESTAMP | Дата обновления |

**Связи:**
- FOREIGN KEY (project_id) → PROJECTS(id) ON DELETE SET NULL

---

### 5. COMMENTS (Комментарии)

Комментарии к новостям.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| news_id | INTEGER NOT NULL | ID новости |
| user_id | INTEGER NOT NULL | ID автора |
| content | TEXT NOT NULL | Текст комментария |
| created_at | TIMESTAMP | Дата создания |

**Связи:**
- FOREIGN KEY (news_id) → NEWS(id)
- FOREIGN KEY (user_id) → USERS(id)

---

### 6. DONATIONS (Донаты)

Хранит информацию о пожертвованиях.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| user_id | INTEGER NOT NULL | ID донора |
| project_id | INTEGER NOT NULL | ID проекта |
| amount | INTEGER NOT NULL | Сумма пожертвования |
| status | TEXT DEFAULT 'pending' | Статус: pending, completed, cancelled |
| created_at | TIMESTAMP | Дата создания |

**Связи:**
- FOREIGN KEY (user_id) → USERS(id)
- FOREIGN KEY (project_id) → PROJECTS(id)

---

### 7. VOLUNTEER_HOURS (Волонтерские часы)

Учет волонтерских часов по проектам.

| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | INTEGER PRIMARY KEY | Уникальный идентификатор |
| user_id | INTEGER NOT NULL | ID волонтера |
| project_id | INTEGER NOT NULL | ID проекта |
| hours | INTEGER NOT NULL | Количество часов |
| date | DATE | Дата активности |
| created_at | TIMESTAMP | Дата записи |

**Связи:**
- FOREIGN KEY (user_id) → USERS(id)
- FOREIGN KEY (project_id) → PROJECTS(id)

---

## ER-диаграмма (текстовая)

```
USERS ||--o{ PROJECT_PARTICIPANTS : участвует
USERS ||--o{ DONATIONS : делает
USERS ||--o{ VOLUNTEER_HOURS : работает
USERS ||--o{ COMMENTS : пишет

PROJECTS ||--o{ PROJECT_PARTICIPANTS : имеет
PROJECTS ||--o{ NEWS : содержит
PROJECTS ||--o{ DONATIONS : получает
PROJECTS ||--o{ VOLUNTEER_HOURS : требует

NEWS ||--o{ COMMENTS : имеет
```

---

## SQL-запросы для частых операций

### Получить все проекты с количеством участников
```sql
SELECT 
    p.*,
    COUNT(DISTINCT CASE WHEN pp.role = 'volunteer' THEN pp.user_id END) as volunteer_count,
    COUNT(DISTINCT CASE WHEN pp.role = 'donor' THEN pp.user_id END) as donor_count
FROM projects p
LEFT JOIN project_participants pp ON p.id = pp.project_id
GROUP BY p.id;
```

### Получить проекты пользователя
```sql
SELECT p.*, pp.role, pp.hours_contributed, pp.amount_donated
FROM projects p
JOIN project_participants pp ON p.id = pp.project_id
WHERE pp.user_id = ?;
```

### Общая статистика
```sql
-- Всего пожертвовано
SELECT SUM(amount) FROM donations WHERE status = 'completed';

-- Всего волонтерских часов
SELECT SUM(hours) FROM volunteer_hours;

-- Количество участников по проектам
SELECT 
    p.name,
    COUNT(DISTINCT pp.user_id) as total_participants
FROM projects p
LEFT JOIN project_participants pp ON p.id = pp.project_id
GROUP BY p.id;
```

---

## Триггеры (рекомендуемые)

### Автоматическое обновление статуса проекта
```sql
-- Обновление статуса на 'active' когда наступает start_date
-- Обновление статуса на 'completed' когда проходит end_date
```

### Обновление collected_amount при донате
```sql
-- При добавлении доната со статусом 'completed'
-- UPDATE projects SET collected_amount = collected_amount + ? WHERE id = ?
```
