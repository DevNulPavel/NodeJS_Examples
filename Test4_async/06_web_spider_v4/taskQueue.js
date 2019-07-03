"use strict";

module.exports = class TaskQueue {
    constructor (concurrency) {
        this.concurrency = concurrency; // Максимальное количество запущенных задач
        this.running = 0;   // Текущее количество активных задач
        this.queue = [];    // Очередь задач
    }
    
    pushTask (task) {
        this.queue.push(task);  // Сохраняем в очереди задачи
        this.next();            // Начинаем выполнять очередную задачу
    }
    
    next() {
        // Проверяем, что количество активных задач меньше максимального и у нас есть задачи
        while((this.running < this.concurrency) && this.queue.length) {
            // Получаем очередную задачу
            const task = this.queue.shift();
            // Запускаем задачу очередную
            task (() => {
                this.running--;
                // Запускаем следующую задачу
                this.next();
            });
            // Количество активных задач
            this.running++;
        }
    }
};
