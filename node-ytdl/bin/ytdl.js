#!/usr/bin/env node

let url;

const info = require('../package'); // Так можно распарсить данные из package.json
const chalk = require('chalk'); // Библиотека для изменения цвета выводимого текста в коммандную строку

// Парсим параметры коммандной строки
const opts = require('commander')
    .version(info.version)
    .arguments('<url>')
    .action((a) => { url = a; }) // Параметр без ключа
    .option('-q, --quality <ITAG>', 'Video quality to download, default: highest')
    .option('-r, --range <INT>..<INT>', 'Byte range to download, ie 10355705-12452856')
    .option('-b, --begin <INT>', 'Time to begin video, format by 1:30.123 and 1m30s')
    .option('-o, --output <FILE>', 'Save to file, template by {prop}, default: stdout or {title}')
    .option('--filter <STR>', 'Can be video, videoonly, audio, audioonly', /^(video|audio)(only)?$/)
    .option('--filter-container <REGEXP>', 'Filter in format container')
    .option('--unfilter-container <REGEXP>', 'Filter out format container')
    .option('--filter-resolution <REGEXP>', 'Filter in format resolution')
    .option('--unfilter-resolution <REGEXP>', 'Filter out format resolution')
    .option('--filter-encoding <REGEXP>', 'Filter in format encoding')
    .option('--unfilter-encoding <REGEXP>', 'Filter out format encoding')
    .option('-i, --info', 'Print video info without downloading')
    .option('-j, --info-json', 'Print video info as JSON without downloading')
    .option('--print-url', 'Print direct download URL')
    .option('--no-cache', 'Skip file cache for html5player')
    .option('--debug', 'Print debug information')
    .parse(process.argv);

// Если не был передан URL - выводим помощь
if (!url) {
    opts.outputHelp((help) => {
        // Библиотека для изменения цвета выводимого текста в коммандную строку
        return chalk.red('\n  url argument is required\n') + help;
    });
    process.exit(1);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const homedir = require('homedir');
const util = require('../lib/util');

const label = chalk.bold.gray;


ytdl.cache.info.timeout = 0;
if (opts.cache !== false) {
    // Кеш у нас будет в файлике .json в домашней папке
    const cachefile = path.resolve(homedir(), '.ytdl-cache.json');
    let cache = {};

    // Читаем файлик
    fs.readFile(cachefile, (err, contents) => {
        if (err) return;
        try {
            cache = JSON.parse(contents); // Так можно распарсить JSON
        } catch (err) {
            console.error(`Badly formatted cachefile (${cachefile}): ${err.message}`);
        }
    });
    
    // Устанавливаем функции работы с кэшем
    ytdl.cache.sig.get = (key) => { 
        return cache[key]; 
    }
    ytdl.cache.sig.set = (key, value) => {
        cache[key] = value;
        fs.writeFile(cachefile,
            JSON.stringify(cache, null, 4), () => {});
        };
    }
    
    // Функция вывода информации о файлике
    const printVideoInfo = (info, live) => {
        console.log();
        console.log(label('title: ') + info.title);
        console.log(label('author: ') + info.author.name);
        console.log(label('avg rating: ') + info.player_response.videoDetails.averageRating);
        console.log(label('views: ') + info.player_response.videoDetails.viewCount);
        if (!live) {
            console.log(label('length: ') + util.toHumanTime(info.length_seconds));
        }
    };
    
    // Нужно ли нам выводить информацию о видео в виде JSON
    if (opts.infoJson) {
        ytdl.getInfo(url, { debug: opts.debug }, (err, info) => {
            if (err) {
                console.error(err.message);
                process.exit(1);
                return;
            }
            console.log(JSON.stringify(info));
        });
    // Нужно ли нам выводить информацию о видео в виде текста
    } else if (opts.info) {
        const cliff = require('cliff');
        ytdl.getInfo(url, { debug: opts.debug }, (err, info) => {
            if (err) {
                console.error(err.message);
                process.exit(1);
                return;
            }
            
            printVideoInfo(info, info.formats.some(f => f.live));
            
            const cols = [
                'itag',
                'container',
                'resolution',
                'video enc',
                'audio bitrate',
                'audio enc'
            ];
            info.formats.forEach((format) => {
                format['video enc']     = format.encoding;
                format['audio bitrate'] = format.audioBitrate;
                format['audio enc']     = format.audioEncoding;
                cols.forEach((col) => {
                    format[col] = format[col] || '';
                });
            });
            console.log(label('formats:'));
            const colors = ['green', 'blue', 'green', 'blue', 'green', 'blue'];
            console.log(cliff.stringifyObjectRows(info.formats, cols, colors));
        });

    // Иначе начинаем загрузку файла
    } else {
        // Выходной файлик
        let output = opts.output;
        // Получаем расширение файлика
        let ext = (output || '').match(/(\.\w+)?$/)[1];
        
        // TODO: ???
        if (output) {
            if (ext && !opts.quality && !opts.filterContainer) {
                opts.filterContainer = '^' + ext.slice(1) + '$';
            }
        } else if (process.stdout.isTTY) {
            output = '{title}';
        }
        
        const ytdlOptions = {};
        // Качество
        ytdlOptions.quality = /,/.test(opts.quality) ? opts.quality.split(',') : opts.quality;
        // Диапазон скачивания видео в виде байт
        if (opts.range) {
            let s = opts.range.split('-');
            ytdlOptions.range = { start: s[0], end: s[1] };
        }
        // TODO: Начало скачивания по времени в виде времени
        ytdlOptions.begin = opts.begin;
        
        // Фильтры
        const filters = [];
        
        // Функция создания фильтра
        const createFilter = (field, regexpStr, negated) => {
            let regexp;
            try {
                regexp = new RegExp(regexpStr, 'i');
            } catch (err) {
                console.error(err.message);
                process.exit(1);
            }
            
            filters.push(format => negated !== regexp.test(format[field]));
        };
        
        ['container', 'resolution', 'encoding'].forEach((field) => {
            let key = 'filter' + field[0].toUpperCase() + field.slice(1);
            if (opts[key]) {
                createFilter(field, opts[key], false);
            }
            
            key = 'un' + key;
            if (opts[key]) {
                createFilter(field, opts[key], true);
            }
        });
        
        // Support basic ytdl-core filters manually, so that other
        // cli filters are supported when used together.
        switch (opts.filter) {
            case 'video':
            filters.push(format => format.bitrate);
            break;
            
            case 'videoonly':
            filters.push(format => format.bitrate && !format.audioBitrate);
            break;
            
            case 'audio':
            filters.push(format => format.audioBitrate);
            break;
            
            case 'audioonly':
            filters.push(format => !format.bitrate && format.audioBitrate);
            break;
        }
        
        // Назначаем функцию для фильтрации
        ytdlOptions.filter = (format) => {
            return filters.every(filter => filter(format));
        };
        
        // Надо ли нам просто вывести информацию
        if (opts.printUrl) {
            ytdl.getInfo(url, { debug: opts.debug }, (err, info) => {
                if (err) {
                    console.error(err.message);
                    process.exit(1);
                    return;
                }
                let format = ytdl.chooseFormat(info.formats, ytdlOptions);
                if (format instanceof Error) {
                    console.error(format.message);
                    process.exit(1);
                    return;
                }
                console.log(format.url);
            });
        } else {
            // Создаем непосредственно объект загрузки
            const readStream = ytdl(url, ytdlOptions);
            // Проверяем, можем ли мы менять стандартный вывод, для динамического прогрессбара
            const stdoutMutable = process.stdout && process.stdout.cursorTo && process.stdout.clearLine;

            let isPlaylist = false;
            
            // Назначаем обработчик на получение информации
            readStream.on('info', (info, format) => {
                // Если не надо выводить в файл, то выводим в stdout
                if (!output) {
                    readStream.pipe(process.stdout).on('error', (err) => {
                        console.error(err.message);
                        process.exit(1);
                    });
                    return;
                }
                
                // Иначе получаем имя выходного файлика
                output = util.tmpl(output, [info, format]);
                if (!ext && format.container) {
                    output += '.' + format.container;
                }
                
                // На всякий пожарный валидируем выходной путь к файлику
                let parsedOutput = path.parse(output);
                output = path.format({
                    dir: parsedOutput.dir,
                    base: parsedOutput.base,
                });
                
                // Назначаем вывод непосредственно в файлик
                console.log('base', parsedOutput.base);
                console.log('output', output);
                readStream.pipe(fs.createWriteStream(output)).on('error', (err) => {
                    // TODO: надо ли тут удалить целевой файлик?
                    console.error(err.message);
                    process.exit(1);
                });
                
                // Плейлист ли это?
                isPlaylist = format.live || format.isHLS || format.isDashMPD;
                
                // Print information about the video if not streaming to stdout.
                printVideoInfo(info, isPlaylist);
                
                console.log(label('container: ') + format.container);
                console.log(label('resolution: ') + format.resolution);
                console.log(label('encoding: ') + format.encoding);
                if (!isPlaylist) { 
                    return; 
                }
                
                // Грузим библиотеку, которая отвечает за текста в терминале
                const throttle = require('lodash.throttle');

                // Обновлять будем прогресс каждые 500 миллисекунд
                let dataRead = 0;
                const updateProgress = throttle(() => {
                    process.stdout.cursorTo(0);
                    process.stdout.clearLine(1);
                    let line = label('size: ') + util.toHumanSize(dataRead);
                    if (dataRead >= 1024) {
                        line += ` (${dataRead} bytes)`;
                    }
                    process.stdout.write(line);
                }, 500);
                
                // Помимо стрима сохранения данных, назначаем коллбек на поступление новых данных
                // в котором будем как раз обновлять размер данных + обновлять прогресс
                readStream.on('data', (data) => {
                    dataRead += data.length;
                    if (stdoutMutable) {
                        updateProgress();
                    }
                });
                
                // Помимо прочего, подписываемся на событие окончания
                readStream.on('end', () => {
                    if (stdoutMutable) {
                        updateProgress.flush(); // TODO: ???
                        console.log();
                    } else {
                        console.log('\n' + label('downloaded: ') + util.toHumanSize(dataRead));
                    }
                });
            });
            
            // Вызывается один раз на событие ответа от сервера
            readStream.once('response', (res) => {
                if (!output || isPlaylist) { 
                    return; 
                }
                
                // Выводим инфу о формате загрузкм
                const size = parseInt(res.headers['content-length'], 10);
                console.log(label('size: ') + util.toHumanSize(size) + ' (' + size +' bytes)');
                console.log(label('output: ') + output);
                console.log();

                // Если не можем менять наш терминал
                if (!stdoutMutable) { 
                    return; 
                }
                
                // Создаем прогресс бар
                const bar = require('progress-bar').create(process.stdout, 50);
                bar.format = '$bar; $percentage;%';

                const throttle = require('lodash.throttle');
                
                let lastPercent = null;
                let updateBar = () => {
                    let percent = dataRead / size;
                    let newPercent = Math.floor(percent * 100);
                    if (newPercent != lastPercent) {
                        lastPercent = newPercent;
                        bar.update(percent);
                    }
                };
                let updateBarThrottled = throttle(updateBar, 100, { trailing: false });
                
                // Keep track of progress.
                let dataRead = 0;
                readStream.on('data', (data) => {
                    dataRead += data.length;
                    if (dataRead === size) {
                        updateBar();
                    } else {
                        updateBarThrottled();
                    }
                });
                
                readStream.on('end', () => {
                    console.log();
                });
            });
            
            readStream.on('error', (err) => {
                // TODO: Надо бы удалить файлик??
                console.error(err.message);
                process.exit(1);
            });
            
            process.on('SIGINT', () => {
                // TODO: Надо бы удалить файлик при прерывании??
                console.log();
                process.exit();
            });
        }
    }
    