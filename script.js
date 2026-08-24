const translations = {
    ru: {
        title: "🗓 Smart Planner", startLabel: "Начало дня:", nowBtn: "Сейчас",
        taskNameHolder: "Название задачи", minsHolder: "Минут", addBtn: "Добавить",
        draftTitle: "Список дел", clearBtn: "Очистить всё", generateBtn: "Сгенерировать расписание",
        readyTitle: "Готовое расписание", notifyTime: "Время для задачи!"
    },
    en: {
        title: "🗓 Smart Planner", startLabel: "Start time:", nowBtn: "Now",
        taskNameHolder: "Task name", minsHolder: "Mins", addBtn: "Add Task",
        draftTitle: "Task List", clearBtn: "Clear All", generateBtn: "Generate Schedule",
        readyTitle: "Schedule", notifyTime: "Time for task!"
    }
};

window.addTime = function(mins) {
    const input = document.getElementById('task-duration');
    let currentVal = parseInt(input.value);
    if (isNaN(currentVal)) currentVal = 0;
    input.value = currentVal + mins;
};


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('Service Worker зарегистрирован!');
    }).catch(err => {
        console.error('Ошибка Service Worker:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const taskNameInput = document.getElementById('task-name');
    const taskDurationInput = document.getElementById('task-duration');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksUl = document.getElementById('tasks-ul');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const scheduleUl = document.getElementById('schedule-ul');
    const startTimeInput = document.getElementById('start-time');
    const setNowBtn = document.getElementById('set-now-btn');
    
    const themeToggle = document.getElementById('theme-toggle');
    const langToggle = document.getElementById('lang-toggle');

    let tasks = JSON.parse(localStorage.getItem('plannerTasks')) || [];
    let scheduledTasks = []; 
    let timerId = null;

    
    let currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerText = '🌙';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggle.innerText = isLight ? '🌙' : '☀️';
    });

    
    let currentLang = localStorage.getItem('lang') || 'ru';
    
    function applyLanguage(lang) {
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            const key = elem.getAttribute('data-i18n');
            if (translations[lang][key]) elem.innerText = translations[lang][key];
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(elem => {
            const key = elem.getAttribute('data-i18n-ph');
            if (translations[lang][key]) elem.placeholder = translations[lang][key];
        });
        langToggle.innerText = lang === 'ru' ? 'EN' : 'RU';
        document.documentElement.lang = lang;
    }

    applyLanguage(currentLang);

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'ru' ? 'en' : 'ru';
        localStorage.setItem('lang', currentLang);
        applyLanguage(currentLang);
    });

    
    const savedTime = localStorage.getItem('plannerStartTime');
    if (savedTime && startTimeInput) startTimeInput.value = savedTime;

    if (startTimeInput) {
        startTimeInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, ''); 
            if (val.length > 2) val = val.substring(0, 2) + ':' + val.substring(2, 4);
            e.target.value = val;
            localStorage.setItem('plannerStartTime', val);
        });
    }

    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    if (setNowBtn) {
        setNowBtn.addEventListener('click', () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            startTimeInput.value = `${hours}:${minutes}`;
            localStorage.setItem('plannerStartTime', startTimeInput.value);
            if (tasks.length > 0) generateSchedule();
        });
    }

    function saveTasks() { localStorage.setItem('plannerTasks', JSON.stringify(tasks)); }

    function renderTasks() {
        if (!tasksUl) return;
        tasksUl.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            textSpan.textContent = `${task.name} (${task.duration} ${currentLang === 'ru' ? 'мин' : 'm'})`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✖';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
                if (tasks.length > 0) generateSchedule();
                else scheduleUl.innerHTML = '';
            };
            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            tasksUl.appendChild(li);
        });
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const name = taskNameInput.value;
            const duration = parseInt(taskDurationInput.value);
            if (name && duration) {
                tasks.push({ name, duration });
                saveTasks();
                renderTasks();
                taskNameInput.value = '';
                taskDurationInput.value = '';
                generateSchedule(); 
            }
        });
    }

    function generateSchedule() {
        if (!scheduleUl) return;
        scheduleUl.innerHTML = ''; 
        scheduledTasks = []; 
        if (tasks.length === 0) return;

        let timeStr = startTimeInput.value || "12:00";
        if (!timeStr.includes(':')) timeStr += ':00';
        
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours)) hours = 12;
        if (isNaN(minutes)) minutes = 0;

        let currentTime = new Date();
        currentTime.setHours(hours, minutes, 0, 0);

        tasks.forEach((task, index) => {
            let taskStartTime = new Date(currentTime);
            scheduledTasks.push({ name: task.name, time: taskStartTime, notified: false });

            let startStr = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            currentTime.setMinutes(currentTime.getMinutes() + task.duration);
            let endStr = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const li = document.createElement('li');
            const contentDiv = document.createElement('div');
            contentDiv.className = 'task-info';
            contentDiv.innerHTML = `<span class="time-badge">${startStr} - ${endStr}</span> <span>${task.name}</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✖';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
                if (tasks.length > 0) generateSchedule();
                else scheduleUl.innerHTML = '';
            };

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);
            scheduleUl.appendChild(li);
            currentTime.setMinutes(currentTime.getMinutes() + 10); 
        });

        if (timerId) clearInterval(timerId);
        timerId = setInterval(checkTime, 5000);
    }

    if (generateBtn) generateBtn.addEventListener('click', generateSchedule);

    if (clearBtn) {
        clearBtn.onclick = () => {
            tasks = [];
            scheduledTasks = [];
            saveTasks();
            renderTasks();
            scheduleUl.innerHTML = '';
            if (timerId) clearInterval(timerId);
        };
    }

    function checkTime() {
        let now = new Date();
        scheduledTasks.forEach(task => {
            if (!task.notified && now.getHours() === task.time.getHours() && now.getMinutes() === task.time.getMinutes()) {
                task.notified = true;
                const notifyMsg = translations[currentLang].notifyTime;
                sendNotification("Smart Planner", `${notifyMsg} ${task.name}`);
            }
        });
    }

    -
    function sendNotification(title, body) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: 'https://cdn-icons-png.flaticon.com/512/3209/3209265.png',
                        vibrate: [200, 100, 200, 100, 200], // Двойная вибрация
                        requireInteraction: true // Чтобы пуш не исчезал сам по себе
                    });
                });
            } else {
                
                new Notification(title, { body: body });
            }
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") sendNotification(title, body);
            });
        }
    }

    renderTasks(); 
    if (tasks.length > 0) generateSchedule(); 
});
