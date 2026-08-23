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

    let tasks = JSON.parse(localStorage.getItem('plannerTasks')) || [];
    let scheduledTasks = []; 
    let timerId = null;

    // Восстанавливаем время из памяти
    const savedTime = localStorage.getItem('plannerStartTime');
    if (savedTime && startTimeInput) {
        startTimeInput.value = savedTime;
    }

    // Умный ввод времени
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

    // Запрос уведомлений
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Кнопка "Сейчас"
    if (setNowBtn) {
        setNowBtn.addEventListener('click', () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            startTimeInput.value = `${hours}:${minutes}`;
            localStorage.setItem('plannerStartTime', startTimeInput.value);
            
            // Если расписание уже активно, пересчитываем его
            if (localStorage.getItem('isScheduleGenerated') === 'true') {
                generateSchedule();
            }
        });
    }

    // Неубиваемая логика кнопок +15, +30, +1ч (ищет по тексту на кнопке)
    const allQuickBtns = document.querySelectorAll('.quick-time-btn');
    allQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            let addMins = 0;
            if (btn.innerText.includes('15')) addMins = 15;
            else if (btn.innerText.includes('30')) addMins = 30;
            else if (btn.innerText.includes('1ч')) addMins = 60;
            else return; // Пропускаем кнопку "Сейчас"

            let currentVal = parseInt(taskDurationInput.value);
            if (isNaN(currentVal)) currentVal = 0;
            taskDurationInput.value = currentVal + addMins;
        });
    });

    function saveTasks() {
        localStorage.setItem('plannerTasks', JSON.stringify(tasks));
    }

    // Отрисовка черновика задач
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
                // Авто-пересчет графика при удалении
                if (localStorage.getItem('isScheduleGenerated') === 'true') {
                    generateSchedule();
                }
            };

            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            tasksUl.appendChild(li);
        });
    }

    // Добавление задачи
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
                
                // Авто-добавление в готовый график
                if (localStorage.getItem('isScheduleGenerated') === 'true') {
                    generateSchedule();
                }
            }
        });
    }

    // Генерация готового расписания
    function generateSchedule() {
        if (!scheduleUl) return;
        scheduleUl.innerHTML = ''; 
        scheduledTasks = []; 
        
        if (tasks.length === 0) {
            localStorage.setItem('isScheduleGenerated', 'false');
            return;
        }

        // Запоминаем, что расписание было сгенерировано
        localStorage.setItem('isScheduleGenerated', 'true');

        let [hours, minutes] = startTimeInput.value.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;

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
                generateSchedule(); 
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

    // Кнопка очистки
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            tasks = [];
            scheduledTasks = [];
            localStorage.setItem('isScheduleGenerated', 'false');
            saveTasks();
            renderTasks();
            scheduleUl.innerHTML = '';
            if (timerId) clearInterval(timerId);
        });
    }

    // Логика уведомлений
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

    // При загрузке страницы отрисовываем задачи
    renderTasks();
    
    // Если график уже был сгенерирован до обновления страницы — сразу строим его снова!
    if (localStorage.getItem('isScheduleGenerated') === 'true' && tasks.length > 0) {
        generateSchedule();
    }
});
