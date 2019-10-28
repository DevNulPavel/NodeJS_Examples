var torrentStream = require('torrent-stream')
var http = require('http')
var fs = require('fs')
var rangeParser = require('range-parser')
var xtend = require('xtend')
var url = require('url')
var mime = require('mime')
var pump = require('pump')

var parseBlocklist = function (filename) {
    // TODO: support gzipped files
    var blocklistData = fs.readFileSync(filename, { encoding: 'utf8' })
    var blocklist = []
    blocklistData.split('\n').forEach(function (line) {
        var match = null
        if ((match = /^\s*[^#].*?\s*:\s*([a-f0-9.:]+?)\s*-\s*([a-f0-9.:]+?)\s*$/.exec(line))) {
            blocklist.push({
                start: match[1],
                end: match[2]
            })
        }
    })
    return blocklist
}

var truthy = function () {
    return true
}

// Функция создания сервера
var createServer = function (e, opts) {
    // Создаем http сервер
    var server = http.createServer()
    var index = opts.index
    var getType = opts.type || mime.getType.bind(mime) // Функция получения типа контента по имени файлика
    var filter = opts.filter || truthy
    
    // Функция готовности
    var onready = function () {
        if (typeof index !== 'number') {
            index = e.files.reduce(function (a, b) {
                return a.length > b.length ? a : b
            })
            index = e.files.indexOf(index)
        }
        
        e.files[index].select()
        server.index = e.files[index]
        
        if (opts.sort) e.files.sort(opts.sort)
    }
    
    // Если торрент уже готов, запускаем сразу, иначе вешаем обработчик на готовность
    if (e.torrent) {
        onready()
    } else {
        e.on('ready', onready)
    }
    
    // Обработчик запроса
    server.on('request', function (request, response) {
        // Парсим url
        var u = url.parse(request.url)
        // Получаем хост
        var host = request.headers.host || 'localhost'
        
        // функция в плейлист
        var toPlaylist = function () {
            var toEntry = function (file, i) {
                return '#EXTINF:-1,' + file.path + '\n' + 'http://' + host + '/' + i
            }
            
            return '#EXTM3U\n' + e.files.filter(filter).map(toEntry).join('\n')
        }
        
        // Функция конверации в Json текущей информации
        var toJSON = function () {
            // Сколько всего подключено пиров
            var totalPeers = e.swarm.wires
            
            // Активные пиры
            var activePeers = totalPeers.filter(function (wire) {
                return !wire.peerChoking
            })
            
            // Всего объем данных
            var totalLength = e.files.reduce(function (prevFileLength, currFile) {
                return prevFileLength + currFile.length
            }, 0)
            
            // Функция вывода информации о конкретном файле
            var toEntry = function (file, i) {
                return {
                    name: file.name,
                    url: 'http://' + host + '/' + i,
                    length: file.length
                }
            }
            
            // Стата по пирам
            var swarmStats = {
                totalLength: totalLength,
                downloaded: e.swarm.downloaded,
                uploaded: e.swarm.uploaded,
                downloadSpeed: parseInt(e.swarm.downloadSpeed(), 10),
                uploadSpeed: parseInt(e.swarm.uploadSpeed(), 10),
                totalPeers: totalPeers.length,
                activePeers: activePeers.length,
                files: e.files.filter(filter).map(toEntry)
            }
            
            return JSON.stringify(swarmStats, null, '  ')
        }
        
        // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
        // by responding to the OPTIONS preflight request with the specified
        // origin and requested headers.
        if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
            response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
            response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            response.setHeader(
                'Access-Control-Allow-Headers',
                request.headers['access-control-request-headers'])
                response.setHeader('Access-Control-Max-Age', '1728000')
                
                response.end()
                return
            }
            
            if (request.headers.origin) {
                response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
            }
            if (u.pathname === '/') {
                u.pathname = '/' + index
            }
            
            // Если была запрошена иконка, то возвращаем статус 404
            if (u.pathname === '/favicon.ico') {
                response.statusCode = 404
                response.end()
                return
            }
            
            // Если была запрошена JSON информация - возвращаем информацию
            if (u.pathname === '/.json') {
                var json = toJSON()
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.setHeader('Content-Length', Buffer.byteLength(json))
                response.end(json)
                return
            }
            
            // Если был запрошен плейлист
            if (u.pathname === '/.m3u') {
                var playlist = toPlaylist()
                response.setHeader('Content-Type', 'application/x-mpegurl; charset=utf-8')
                response.setHeader('Content-Length', Buffer.byteLength(playlist))
                response.end(playlist)
                return
            }
            
            // TODO: ???
            // Выбор нужного нам файлика?
            e.files.forEach(function (file, i) {
                if (u.pathname.slice(1) === file.name) u.pathname = '/' + i
            })
            
            var i = Number(u.pathname.slice(1))
            
            // Если неверный файлик - значит возвращаем ошибку
            if (isNaN(i) || i >= e.files.length) {
                response.statusCode = 404
                response.end()
                return
            }
            
            // Файлик
            var file = e.files[i]
            // Диапазон данных из файлика
            var range = request.headers.range
            range = range && rangeParser(file.length, range)[0]

            response.setHeader('Accept-Ranges', 'bytes')
            response.setHeader('Content-Type', getType(file.name)) // Возвращаем тип данных
            response.setHeader('transferMode.dlna.org', 'Streaming') // Тип - стрим
            response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
            if (!range) {
                response.setHeader('Content-Length', file.length)
                if (request.method === 'HEAD') {
                    return response.end()
                }
                // Начинаем запись данных из файла в поток
                pump(file.createReadStream(), response)
                return
            }
            
            response.statusCode = 206
            response.setHeader('Content-Length', range.end - range.start + 1)
            response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)
            if (request.method === 'HEAD') {
                return response.end()
            }
            // Начинаем запись в поток
            pump(file.createReadStream(range), response)
    })
        
    // Вызывается на новое подключение
    server.on('connection', function (socket) {
        socket.setTimeout(36000000)
    })
        
    return server
}
    
// Специальная штука, которая возволяем создавать engine - "var engine = peerflix(torrent, argv)"
module.exports = {
    createEngine: function(torrent, opts) {
        // Опции создаем, если нету их
        if (!opts) {
            opts = {}
        }
        
        // Парсим блоклист, функция находится выше
        if (opts.blocklist) {
            opts.blocklist = parseBlocklist(opts.blocklist)
        }
        
        // Создаем потоковый движок работы с торрентом
        var engine = torrentStream(torrent, xtend(opts, {port: opts.peerPort}))
        
        // Если нужен только список файлов, то возвращаем результат
        if (opts.list) {
            return engine
        }
        
        // Паузим или восстанавливаем если надо
        engine.on('uninterested', function () {
            engine.swarm.pause()
        })
        
        engine.on('interested', function () {
            engine.swarm.resume()
        })
        
        // Создаем непосредственно сервер
        engine.server = createServer(engine, opts)
        
        // Вызывается, когда торрент поток будет готов
        engine.on('ready', function () {
            // Запускаем сервер
            engine.server.listen(opts.port || 0, opts.hostname)
        })
        
        engine.listen()
        
        return engine
    }
}