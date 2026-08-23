document.addEventListener('DOMContentLoaded', () => {
    const taskNameInput = document.getElementById('task-name');
    const taskDurationInput = document.getElementById('task-duration');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksUl = document.getElementById('tasks-ul');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const scheduleUl = document.getElementById('schedule-ul');
    const startTimeInput = document.getElementById('start-time');
    const quickBtns = document.querySelectorAll('.quick-btn');

    // Загружаем данные из памяти браузера (или создаем пустые)
    let tasks = JSON.parse(localStorage.getItem('plannerTasks')) || [];
    let scheduledTasks = []; 
    let timerId = null;

    // Восстанавливаем сохраненное время начала
    const savedTime = localStorage.getItem('plannerStartTime');
    if (savedTime) startTimeInput.value = savedTime;

    // Сохраняем время при любом изменении
    startTimeInput.addEventListener('change', () => {
        localStorage.setItem('plannerStartTime', startTimeInput.value);
    });

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Функция сохранения задач в память
    function saveTasks() {
        localStorage.setItem('plannerTasks', JSON.stringify(tasks));
    }

    // Отрисовка списка дел
    function renderTasks() {
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
                if (scheduleUl.innerHTML !== '') generateSchedule(); // Авто-пересчет
            };

            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            tasksUl.appendChild(li);
        });
    }

    // Логика быстрых кнопок времени
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const addTime = parseInt(btn.getAttribute('data-time'));
            let currentVal = parseInt(taskDurationInput.value) || 0;
            taskDurationInput.value = currentVal + addTime;
        });
    });

    // Добавление новой задачи
    addTaskBtn.addEventListener('click', () => {
        const name = taskNameInput.value;
        const duration = parseInt(taskDurationInput.value);

        if (name && duration) {
            tasks.push({ name, duration });
            saveTasks();
            renderTasks();
            taskNameInput.value = '';
            taskDurationInput.value = '';
            if (scheduleUl.innerHTML !== '') generateSchedule(); // Авто-добавление в готовый график
        }
    });

    // Генерация расписания
    function generateSchedule() {
        scheduleUl.innerHTML = ''; 
        scheduledTasks = []; 
        
        if (tasks.length === 0) return;

        let [hours, minutes] = startTimeInput.value.split(':').map(Number);
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
                generateSchedule(); // Пересчитываем график
            };

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);
            scheduleUl.appendChild(li);
            
            currentTime.setMinutes(currentTime.getMinutes() + 10); 
        });

        if (timerId) clearInterval(timerId);
        timerId = setInterval(checkTime, 5000);
    }

    generateBtn.addEventListener('click', generateSchedule);

    // Кнопка очистки
    clearBtn.addEventListener('click', () => {
        tasks = [];
        scheduledTasks = [];
        saveTasks();
        renderTasks();
        scheduleUl.innerHTML = '';
        if (timerId) clearInterval(timerId);
    });

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

    // Запускаем отрисовку сохраненных задач при загрузке страницы
    renderTasks();
});
