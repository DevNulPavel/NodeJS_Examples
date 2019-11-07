"use strict";


// Прокидываем коллбек внутрь функции
{
	/*function add(a, b) {
		return a + b;
	}*/

	function addCB(a, b, callback) {
		callback(a + b);
	}

	console.log('before');
	const callback = result => { 
		console.log('Result: ' + result); 
	};
	addCB(1, 2, callback);
	console.log('after');
}

// Коллбек с отложенным вызовом
{
	console.log('');

	function additionAsync(a, b, callback) {
		const localCallback = () => {
			callback(a + b); // Делаем замыкание
		};

		// Главным преимуществом использования setImmediate() вместо setTimeout() является то, 
		// что setImmediate() всегда будет выполняться перед любыми таймерами, 
		// если они запланированы в цикле ввода/вывода, независимо от количества присутствующих таймеров.
		//setInterval() планирует запуск сценария после истечения минимального порога в миллисекундах с периодичностью определенной
		//setTimeout() планирует запуск сценария после истечения минимального порога в миллисекундах.
		//setImmediate() предназначен для выполнения сценария после завершения текущей фазы опроса, срабатывает на следующей итерации или «тике» цикла событий
		//process.nextTick() срабатывает сразу на той же фазе
		setTimeout(localCallback, 100);
	}

	console.log('before');
	additionAsync(1, 2, result => console.log('Result: ' + result));
	console.log('after');
}

// Функции можно применять так же для изменения значений
{
	console.log('');

	const callback = element => {
	 	return element - 1;
	}
	const result = [1, 5, 7].map(callback);
	console.log(result); // [0, 4, 6]
}

// Тест работы с файловой системой
// TODO: Данная реализация имеет проблему, срабатывает толкьо первый коллбек
// Как видите, обратный вызов во второй операции так и не был выполнен. Давайте выясним, почему так получилось.
// Вовремя создания reader1 функция inconsistentRead() выполняется асинхрон­но, поскольку в кэше еще нет результата. 
// Таким образом, имеется возможность зарегистрировать обработчика, что и будет сделано в другой итерации цикла
// событий, до завершения операции чтения.
// Затем в итерации цикла событий создается reader2, когда файл уже находится
// в кэше. В этом случае внутренний вызов inconsistentRead() будет выполнен синхронно. То есть он выполнит функцию обратного вызова немедленно, и, со­ ответственно, все обработчики события reader2 также будут вызваны синхрон­ но. 
// Однако регистрация обработчиков выполняется после создания reader2, поэтому они никогда не будут вызваны.
{
	const fs = require('fs');
	const cache = {}; // Кэш для данных файлов

	function inconsistentRead(filename, callback) {
		// Если данные есть в кэше
		if(cache[filename]) {
			// Тогда просто вызываем коллбек с данными
			//callback(cache[filename]);
			// Правильный вариант вызова коллбека
			setImmediate(() => callback(cache[filename]));
		} else {
			// Асинхронно читаем данные
			fs.readFile(filename, 'utf8', (err, data) => {
				cache[filename] = data;
				callback(data);
			});
		}
	}

	function createFileReader(filename) {
		const listeners = [];

		var callback = value => {
			listeners.forEach(listener => listener(value));
		}
		inconsistentRead(filename, callback);

		var readerWithMethod = {
			onDataReady: listener => {
				listeners.push(listener)
			}
		};
		return readerWithMethod;
	}

	// Создаем читалку файлов
	const reader1 = createFileReader('data_1.txt');
	var readCompleteCallback1 = data => {
		console.log('First call data: ' + data);

		// Здесь происходит ошибка, так как мы из коллбека пытаемся вызвать сихнронно еще один коллбек

		// ...sometime later we try to read again from the same file
		const reader2 = createFileReader('data_1.txt');
		var readerCompleteCallback2 = data => {
			console.log('Second call data: ' + data);
		};
		reader2.onDataReady(readerCompleteCallback2);
	};
	reader1.onDataReady(readCompleteCallback1);
}

// Вариант с синхронным чтением
{
	const fs = require('fs');
	const cache = {};
	function consistentReadSync(filename) {
		if(cache[filename]) {
			return cache[filename];
		} else {
			cache[filename] = fs.readFileSync(filename, 'utf8');
			return cache[filename];
		}
	}

	console.log(consistentReadSync('data_1.txt'));
	// the next call will read from the cache
	console.log(consistentReadSync('data_1.txt'));
}

// Правильный вариант, когда оба наших коллбека являются асинронным
{
	const fs = require('fs');
	const cache = {};

	// Поведение функции всегда асинхронно
	function consistentReadAsync(filename, callback) {
		if(cache[filename]) {
			process.nextTick(() => callback(cache[filename]));
		} else {
			//asynchronous function
			var localCallback = (err, data) => {
				cache[filename] = data;
				callback(data);
			};
			fs.readFile(filename, 'utf8', localCallback);
		}
	}

	consistentReadAsync('data_1.txt', (data) => {
		console.log("Valid read 1: " + data);
		// the next call will read from the cache but still be async
		consistentReadAsync('data_1.txt', (data) => {
			console.log("Valid read 2: " + data);
		});
	});
}

// Чтение json файла
{
	const fs = require('fs');
	
	// Функция чтения Json файла
	function readJSON(filename, callback) {
		// Коллбек завершения чтения
		var readCallback = (err, data) => {
			if(err){
				// Пробрасываем ошибку чтения файла в коллбек
				return callback(err);
			}

			let parsedData = null;
			try {
				// Парсим содержимое файла раз мы смогли нормально прочитать
				parsedData = JSON.parse(data);
			} catch(err) {
				// Отлавливаем ошибку парсинга если есть и пробрасываем ее
				return callback(err);
			}
			
			// Распарсили без проблем, возвращаем данные
			callback(null, filename, parsedData);
		};

		// Пытаемся прочитать файл
		fs.readFile(filename, 'utf8', readCallback);
	}

	let jsonParseCallback = (err, name, data) => {
		if (err) {
			return console.error(err);
		}
		console.log("Parsed json with name '" + name + "': " + JSON.stringify(data))
	};

	readJSON('valid_json.json', jsonParseCallback); // dumps the content
	//readJSON('invalid_json.json', jsonParseCallback); // prints error (SyntaxError)
}