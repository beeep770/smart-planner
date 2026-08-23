document.addEventListener('DOMContentLoaded', () => {
    const taskNameInput = document.getElementById('task-name');
    const taskDurationInput = document.getElementById('task-duration');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksUl = document.getElementById('tasks-ul');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const scheduleUl = document.getElementById('schedule-ul');
    const startTimeInput = document.getElementById('start-time');

    let tasks = [];
    let scheduledTasks = []; 
    let timerId = null;

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Функция отрисовки черновика (Списка дел)
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
                tasks.splice(index, 1); // Удаляем из массива
                renderTasks(); // Обновляем список
                if (scheduleUl.innerHTML !== '') generateSchedule(); // Авто-пересчет графика
            };

            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            tasksUl.appendChild(li);
        });
    }

    // Добавление задачи
    addTaskBtn.addEventListener('click', () => {
        const name = taskNameInput.value;
        const duration = parseInt(taskDurationInput.value);

        if (name && duration) {
            tasks.push({ name, duration });
            renderTasks();
            taskNameInput.value = '';
            taskDurationInput.value = '';
        }
    });

    // Функция генерации расписания
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
            contentDiv.innerHTML = `<span class="time-badge">${startStr} - ${endStr}</span> ${task.name}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✖';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => {
                tasks.splice(index, 1);
                renderTasks();
                generateSchedule(); // Пересчитываем всё расписание!
            };

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);
            scheduleUl.appendChild(li);
            
            currentTime.setMinutes(currentTime.getMinutes() + 10); 
        });

        if (timerId) clearInterval(timerId);
        timerId = setInterval(checkTime, 5000);
    }

    generateBtn.addEventListener('click', () => {
        generateSchedule();
        if (tasks.length > 0) alert("Расписание готово! Ожидайте уведомлений.");
    });

    // Кнопка очистки всего
    clearBtn.addEventListener('click', () => {
        tasks = [];
        scheduledTasks = [];
        renderTasks();
        scheduleUl.innerHTML = '';
        if (timerId) clearInterval(timerId);
    });

    // Проверка времени для уведомлений
    function checkTime() {
        let now = new Date();
        scheduledTasks.forEach(task => {
            if (!task.notified && now.getHours() === task.time.getHours() && now.getMinutes() === task.time.getMinutes()) {
                task.notified = true;
                sendNotification("Время для задачи!", `Пора начать: ${task.name}`);
            }
        });
    }

    // Отправка уведомления
    function sendNotification(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: body });
        } else {
            alert(`${title}\n${body}`);
        }
    }
});
