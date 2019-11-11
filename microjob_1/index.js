const microjob = require("microjob");

async function startMicroJob(){
    // Запускаем пул воркеров с ожиданием завершения запуска
    console.debug("Microjob start begin");
    const startConfig = {
        maxWorkers: 4 // Тут желательно указать количество ядер CPU
    };
    const startPromise = microjob.start(startConfig);
    await startPromise;
    console.debug("Microjob start eng");
}

async function stopMicroJob(){
    // Дожидаемся завершения работы воркеров
    console.debug("Microjob stop begin");
    const stopPromise = microjob.stop();
    await stopPromise;
    console.debug("Microjob stop end");
}

async function testMicrojob(){
    try{
        await startMicroJob();

        // Описываем обработчик прерывания по Ctrl + C
        var workInterrupt = async function () {
            await stopMicroJob();
        };
        process.on('SIGINT', workInterrupt);
        process.on('SIGTERM', workInterrupt);

        // Описываем CPU bound код
        const cpuBoundCode = (jobData)=>{
            console.debug("Start job with data:", jobData, " and context:", maxCount2);
            const max1 = jobData.maxCount1; // Получаем из параметров
            const max2 = maxCount2;         // Получаем из контекста
            let i = 0;
            for (i = 0; i < max1; i++) {
                for (let j = 0; j < max2; j++) {
                }
            }
            return i;
        };

        // Запускаем задачу в 1м потоке
        const job1Params = {
            data: { 
                maxCount1: 100000, 
            },
            ctx: {
                maxCount2: 20000 // Контекстные переменные
            }
        };
        const cpuBoundJobPromise1 = microjob.job(cpuBoundCode, job1Params);

        // Запускаем задачу во 2м потоке
        const job2Params = {
            data: { 
                maxCount1: 200000
            },
            ctx: {
                maxCount2: 100000 // Контекстные переменные
            }
        };
        const cpuBoundJobPromise2 = microjob.job(cpuBoundCode, job2Params);
        const waitAllPromise = Promise.all([cpuBoundJobPromise1, cpuBoundJobPromise2]);

        // Выполняем что-то в текущем потоке
        const maxCount2 = 30000;
        const data = { 
            maxCount1: 20000
        };
        const result3 = cpuBoundCode(data);

        // Ждем все результаты
        const [result1, result2] = await waitAllPromise;

        // Выводим
        console.debug(`Result 1 is: ${result1}`);
        console.debug(`Result 2 is: ${result2}`);
        console.debug(`Result 3 is: ${result3}`);
    }catch(err){
        console.error(err);
    }finally{
        await stopMicroJob();
    }
}

testMicrojob();