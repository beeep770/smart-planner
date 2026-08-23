// Делаем функцию добавления времени глобальной, чтобы она работала напрямую из HTML
window.addTime = function(mins) {
    const input = document.getElementById('task-duration');
    let currentVal = parseInt(input.value);
    if (isNaN(currentVal)) currentVal = 0;
    input.value = currentVal + mins;
};

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

    // 1. Загружаем задачи из памяти
    let tasks = JSON.parse(localStorage.getItem('plannerTasks')) || [];
    let scheduledTasks = []; 
    let timerId = null;

    // Восстанавливаем время
    const savedTime = localStorage.getItem('plannerStartTime');
    if (savedTime && startTimeInput) {
        startTimeInput.value = savedTime;
    }

    if (startTimeInput) {
        startTimeInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, ''); 
            if (val.length > 2) {
                val = val.substring(0, 2) + ':' + val.substring(2, 4);
            }
            e.target.value = val;
            localStorage.setItem('plannerStartTime', val);
        });
    }

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    if (setNowBtn) {
        setNowBtn.addEventListener('click', () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            startTimeInput.value = `${hours}:${minutes}`;
            localStorage.setItem('plannerStartTime', startTimeInput.value);
            
            // Если есть задачи, сразу перестраиваем график под новое время
            if (tasks.length > 0) generateSchedule();
        });
    }

    function saveTasks() {
        localStorage.setItem('plannerTasks', JSON.stringify(tasks));
    }

    // Отрисовка списка дел (слева)
    function renderTasks() {
        if (!tasksUl) return;
        tasksUl.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            textSpan.textContent = `${task.name} (${task.duration} мин)`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✖';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
                
                // Перерисовываем график при удалении
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
                
                // Сразу автоматически строим график
                generateSchedule(); 
            }
        });
    }

    // Отрисовка готового расписания (справа)
    function generateSchedule() {
        if (!scheduleUl) return;
        scheduleUl.innerHTML = ''; 
        scheduledTasks = []; 
        
        if (tasks.length === 0) return;

        // Чиним время, если случайно стерли двоеточие
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
            
            // 10 минут перерыва
            currentTime.setMinutes(currentTime.getMinutes() + 10); 
        });

        if (timerId) clearInterval(timerId);
        timerId = setInterval(checkTime, 5000);
    }

    if (generateBtn) generateBtn.addEventListener('click', generateSchedule);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            tasks = [];
            scheduledTasks = [];
            saveTasks();
            renderTasks();
            scheduleUl.innerHTML = '';
            if (timerId) clearInterval(timerId);
        });
    }

    function checkTime() {
        let now = new Date();
        scheduledTasks.forEach(task => {
            if (!task.notified && now.getHours() === task.time.getHours() && now.getMinutes() === task.time.getMinutes()) {
                task.notified = true;
                sendNotification("Время для задачи!", `Пора начать: ${task.name}`);
            }
        });
    }

    function sendNotification(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: body });
        } else {
            alert(`${title}\n${body}`);
        }
    }

    // 2. САМОЕ ГЛАВНОЕ: АВТО-ВОССТАНОВЛЕНИЕ ПРИ ОБНОВЛЕНИИ СТРАНИЦЫ
    renderTasks(); // Рисуем левую колонку
    if (tasks.length > 0) {
        generateSchedule(); // Сразу рисуем правую колонку
    }
});
