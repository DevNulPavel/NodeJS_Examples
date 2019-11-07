"use strict";

// Фильтрация с использованием прокидываемой функции
{
	// let/const - область видимости блока, var - область видимость функции или глобальная
	const numbers = [2, 6, 7, 8, 1];
	const even = numbers.filter(function(x) {
	return x%2 === 0;
	});
	console.log(even);
}

// Фильтрация с использованием стрелочной функции
{
	const numbers = [2, 6, 7, 8, 1];
	const even = numbers.filter(x => { 
		return x%2 === 0;
	});
	console.log(even);	
}

// Фильтрация с использованием стрелочной функции
{
	const numbers = [2, 6, 7, 8, 1];
	const even = numbers.filter((x) => {
		if (x%2 === 0) {
			console.log(x + ' is even!');
			return true;
		}
		return false;
	});
	console.log(even);
}


// Неправильное использование контекста в коллбеке
{
	function DelayedGreeter(name) {
	  	this.name = name;
	}

	DelayedGreeter.prototype.greet = function() {
		var callback = function() {
			// контекст this у нас не тот, тут контекст именно текущей функции
			console.log('Hello ' + this.name);
		};
		setTimeout(callback, 250);
	};

	const greeter = new DelayedGreeter('World');
	greeter.greet(); // will print “Hello undefined”	
}

// Правильное использование коллбека в контексте коллбека
{
	function DelayedGreeter(name) {
  		this.name = name;
	}

	DelayedGreeter.prototype.greet = function() {
		const callback = function() {
			// Здесь мы работаем с this, который был привязан 
	    	console.log('Hello ' + this.name);
		}.bind(this); // Привязываем контекст к коллбеку  
	  	setTimeout(callback , 500);
	};

	const greeter = new DelayedGreeter('World');
	greeter.greet(); // will print “Hello World”
}

// То же самое, но со стрелочной функцией
{
	function DelayedGreeter(name) {
	  	this.name = name;
	}

	DelayedGreeter.prototype.greet = function() {
		// Стрелочная функция автоматически биндит переменные
		const callback = () => {
			console.log('Hello ' + this.name);
		};
	  	setTimeout(callback , 750);
	};

	const greeter = new DelayedGreeter('World');
	greeter.greet(); // will print “Hello World”
}

// Время жизни переменной неверное
{
	if (true) {
		//let x = "hello"; // let живет в пределах блока
		//const x = "hello"; // const живет в пределах блока
		//var x = "VAR"; // var живет в пределах функции / глобально
	}
	console.log(x); // ReferenceError: x is not defined

	for (let i=0; i < 10; i++) {
	  	// do something here
	}
	//console.log(i); // ReferenceError: i is not defined
}

// Константа - значит нельзя изменять ссылку на переменную, сам объект изменяемый
{
	const x = 'This will never change';
	//x = '...'; // TypeError: Assignment to constant variable.
	const y = {};
	y.name = 'John'; // This is allowed
	//y = null; // This will fail

	const path = require('path');
	// .. do stuff with the path module
	//var path = './some/path'; // this will fail
}


// Старый способ описания класса из JS
{
	function Person(name, surname, age) {
		this.name = name;
		this.surname = surname;
		this.age = age;
	}
	// Аналог метода, доступен this
	Person.prototype.getFullName = function() {
	  	return this.name + ' ' + this.surname;
	};
	// Аналог статической функции, this недоступен
	Person.older = function(person1, person2) {
	  	return (person1.age >= person2.age) ? person1 : person2;
	};

	const luciano = new Person('Luciano', 'Mammino', 29);
	console.log(luciano.getFullName());
	const alan = new Person('Alan', 'Turing', 104);
	console.log(Person.older(luciano, alan));
}

// Новый способ описания классов
{
	class Person {
		constructor(name, surname, age) {
			this.name = name;
			this.surname = surname;
			this.age = age;
		}
		getFullName() {
			return this.name + ' ' + this.surname;
		}
		static older(person1, person2) {
			return (person1.age >= person2.age) ? person1 : person2;
		}
	}

	const luciano = new Person('Luciano', 'Mammino', 29);
	console.log(luciano.getFullName());
	const alan = new Person('Alan', 'Turing', 104);
	console.log(Person.older(luciano, alan));
}

// Наследование классов
{
	class Person {
		constructor(name, surname, age) {
			this.name = name;
			this.surname = surname;
			this.age = age;
		}
		getFullName () {
			return this.name + ' ' + this.surname;
		}
		static older (person1, person2) {
			return (person1.age >= person2.age) ? person1 : person2;
		}
	}
	class PersonWithMiddlename extends Person {
		constructor (name, middlename, surname, age) {
			super(name, surname, age);
			this.middlename = middlename;
		}
		getFullName () {
			return this.name + ' ' + this.middlename + ' ' + this.surname;
		}
	}
	const alan = new PersonWithMiddlename('Alan', 'Mathison', 'Turing', 104);
	console.log(alan.getFullName());
}

// Создание словаря
{
	const x = 22;
	const y = 17;
	const obj = { x, y }; // Объекты словари
	console.log(obj);
}

// Экспортируем функции в модуль
{
	module.exports = {
		square (x) {
			return x * x;
		},
		cube (x) {
			return x * x * x;
		}
	};
	console.log(module.exports);
}

// Сложное создание словаря
{
	let namespace = '-webkit-';
	let style = {
		[namespace + 'box-sizing'] : 'border-box',
		[namespace + 'box-shadow'] : '10px 10px 5px #888888'
	};
	console.log(style);
}

// Создание сложного словаря с геттером и сеттером
{
	console.log("\n");

	let person = {
		name : 'George',
		surname : 'Boole',

		get fullname () {
			return this.name + ' ' + this.surname;
		},
		set fullname (fullname) {
			let parts = fullname.split(' ');
			this.name = parts[0];
			this.surname = parts[1];
		}
	};

	console.log(person.fullname); // "George Boole"
	person.fullname = 'Alan Turing';
	console.log(person.fullname); // "Alan Turing"
	console.log(person.name); // "Alan"
}

// Работа c Map
{
	console.log("\n");

	const profiles = new Map();
	profiles.set('twitter', '@adalovelace');
	profiles.set('facebook', 'adalovelace');
	profiles.set('googleplus', 'ada');

	profiles.size; // 3
	profiles.has('twitter'); // true
	profiles.get('twitter'); // "@adalovelace"
	profiles.has('youtube'); // false
	profiles.delete('facebook');
	profiles.has('facebook'); // false
	profiles.get('facebook'); // undefined
	for (let entry of profiles) {
	  	console.log(entry);
	}
}

// Возможность сохранения в качестве ключа функции
{
	console.log("\n");

	const tests = new Map();
	tests.set(() => { 2+2 }, 4);
	tests.set(() => { 2*2 }, 4);
	tests.set(() => { 2/2 }, 1);

	for (let entry of tests) {
		console.log((entry[0]() === entry[1]) ? 'PASS' : 'FAIL');
	}
}

// Работа с set
{
	console.log("\n");

	const s = new Set([0, 1, 2, 3]);

	s.add(3); // will not be added
	s.size; // 4
	s.delete(0);
	s.has(0); // false

	for (let entry of s) {
	  	console.log(entry);
	}
}

// Словарь, в котором мы храним слабые ссылки на объекты
{
	console.log("\n");

	// Создаем словарь
	let keyObj = {};

	// https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
	// Ключами WeakMap могут быть только объекты. Примитивы в качестве ключей не допускаются (т.е. Symbol не может быть ключом WeakMap).
	// Создаем Map, который содержит в себе слабые ссылки на объекты
	const map = new WeakMap();
	map.set(keyObj, {key: "some_value"});

	// Сейчас мы получаем обычный объект
	console.log(map.get(keyObj)); // {key: "some_value"}

	// Сбрасываем ссылку на объект
	keyObj = undefined; // Сбрасываем ссылку, теперь обхект может быть собран сборщиком, так как контейнер WeakMap не увеличивает счетчик ссылок на объект-ключ

	// Теперь будем возвращать пустой объект
	console.log(map.get(keyObj));
}

// Словарь, в котором мы храним слабые ссылки на объекты
{
	console.log("\n");

	let obj1 = {key: "val1"};
	let obj2 = {key: "val2"};
	const set = new WeakSet([obj1, obj2]);

	console.log(set.has(obj1)); // true

	obj1 = undefined; // теперь объект может быть собран сборкой мусора, контейнер не мешает, так как он хранит слабую ссылку

	console.log(set.has(obj1)); // false	
}

// Работа с шаблонами текста
{
	const name = "Leonardo";
	const interests = ["arts", "architecture", "science", "music", "mathematics"];
	const birth = { year : 1452, place : 'Florence' };

	// Подставляем в текст переменную по шаблону
	const text = `${name} was an Italian polymath interested in many topics such as ${interests.join(', ')}. He was born in ${birth.year} in ${birth.place}.`;
	console.log(text);
}


console.log("\n");