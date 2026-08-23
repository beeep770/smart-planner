document.addEventListener('DOMContentLoaded', () => {
    const taskNameInput = document.getElementById('task-name');
    const taskDurationInput = document.getElementById('task-duration');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksUl = document.getElementById('tasks-ul');
    const generateBtn = document.getElementById('generate-btn');
    const scheduleUl = document.getElementById('schedule-ul');
    const startTimeInput = document.getElementById('start-time');

    let tasks = [];

    // Добавление задачи в список
    addTaskBtn.addEventListener('click', () => {
        const name = taskNameInput.value;
        const duration = parseInt(taskDurationInput.value);

        if (name && duration) {
            tasks.push({ name, duration });
            
            const li = document.createElement('li');
            li.textContent = `${name} (${duration} мин)`;
            tasksUl.appendChild(li);

            taskNameInput.value = '';
            taskDurationInput.value = '';
        }
    });

    // Генерация расписания
    generateBtn.addEventListener('click', () => {
        scheduleUl.innerHTML = ''; // Очищаем старое расписание
        
        let [hours, minutes] = startTimeInput.value.split(':').map(Number);
        let currentTime = new Date();
        currentTime.setHours(hours, minutes, 0, 0);

        tasks.forEach(task => {
            // Форматируем время старта задачи
            let startStr = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Прибавляем длительность задачи
            currentTime.setMinutes(currentTime.getMinutes() + task.duration);
            let endStr = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const li = document.createElement('li');
            li.innerHTML = `<span class="time-badge">${startStr} - ${endStr}</span> ${task.name}`;
            scheduleUl.appendChild(li);
            
            // Добавляем 10 минут перерыва между задачами
            currentTime.setMinutes(currentTime.getMinutes() + 10); 
        });
    });
});
