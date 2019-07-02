"use strict";


"use strict";

{
	// Подгружаем логгер, реализованный по-старому, с помощью функции
	const Logger = require('./logger_constructor');

	const dbLogger = new Logger('DB');
	dbLogger.info('This is an informational message');

	const accessLogger = new Logger('ACCESS');
	accessLogger.verbose('This is a verbose message');
}

{
	// Подгружаем класс логгер
	const Logger = require('./logger_class');

	// Создаем новый экземпляр
	const dbLogger = new Logger('DB');
	dbLogger.info('This is an informational message');

	// Создаем еще один экземпляр
	const accessLogger = new Logger('ACCESS');
	accessLogger.verbose('This is a verbose message');
}

{
	// Подгружаем логгер как обычную функцию, которую можно просто вызывать,
	// но у этой функции так же может быть подфункция
	const logger = require('./logger_function');

	logger('This is an informational message');
	logger.verbose('This is a verbose message');
}

{
	// Может экспортироваться непосредственно инстанс логгера
	const logger = require('./logger_instance');
	logger.log('This is an informational message');
}

{
	// Возвращаться всегда будет только один экземпляр логгера, но имя будет меняться
	const logger = require('./logger_guard');

	const dbLogger = logger('DB');
	dbLogger.info('This is an informational message');

	const accessLogger = logger('ACCESS');
	accessLogger.verbose('This is a verbose message');
}

{
	// Возвращаться всегда будет только один экземпляр логгера, но имя будет меняться
	const logger = require('./logger_guard_es2015');

	const dbLogger = logger('DB');
	dbLogger.info('This is an informational message');

	const accessLogger = logger('ACCESS');
	accessLogger.verbose('This is a verbose message');
}