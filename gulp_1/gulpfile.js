"use strict";

const fs = require('fs');
const events = require('events');
const chilp_process = require('child_process');
const del = require("delete");
const rxjs = require('rxjs');
const gulp = require("gulp");
const zip = require('gulp-zip');
const rename = require('gulp-rename');
const gulpif = require('gulp-if');


gulp.task("_copy", function (){
    var src_txt = gulp.src("src/*.txt");
    var zip_files_txt = zip("arch_txt.zip");
    var dst_txt = gulp.dest("res");

    var src_sh = gulp.src("src/**/*.sh");
    var zip_files_sh = zip("arch_sh.zip");
    var dst_sh = gulp.dest("res");

    var resPipe1 = src_txt.pipe(zip_files_txt).pipe(dst_txt);
    var resPipe2 = src_sh.pipe(zip_files_sh).pipe(dst_sh);

    //return gulp.parallel(resPipe1, resPipe2);
    return resPipe1;
});

gulp.task("_watch", function(){
    return gulp.watch("src", ["copy"])
});

////////////////////////////////////////////////////////////

function defaultTask(cb) {
    console.log("Default task");
    cb();
}

function clean(cb) {
    console.log("Clean task");
    del(["res/"], cb);
    //cb(); // Коллбек, который нужно вызвать при завершении задачи
}
  
function buildTxt(cb) {
    console.log("Build txt task");

    var renameCallback = (path)=>{
        //path.dirname += "/ciao";
        path.basename += "_txt";
        path.extname = ".zip";
    };
    var renameConfig = {
        //dirname: "main/text/ciao",
        //basename: "aloha",
        //prefix: "bonjour-",
        //suffix: "-hola",
        extname: ".zip"
    };

    var ifCallback = (file)=>{
        //console.log("Test file rename: " + JSON.stringify(file));
        console.log("Test file rename: " + file.basename);
        return file.extname == ".z";
    };

    var src_txt = gulp.src(["src/*.txt", "!src/excluded*.txt"]);
    var zip_files_txt = zip("arch.z");
    var zip_rename = rename(renameCallback);
    var is_need_rename = gulpif(ifCallback, zip_rename);
    var dst_txt = gulp.dest("res");

    var resPipe = src_txt.pipe(zip_files_txt).pipe(is_need_rename).pipe(dst_txt);

    //cb(); // Коллбек, который нужно вызвать при завершении задачи
    return resPipe; // Либо мы можем вернуть pipe для отслеживания завершения
    //resPipe.end(cb); // Либо мы можем просто назначить коллбек, для оповещения о завершении (не работает)
}

function buildSh(cb) {
    console.log("Build sh task");

    var src_sh = gulp.src("src/**/*.sh");
    var zip_files_sh = zip("arch_sh.zip");
    var dst_sh = gulp.dest("res");
    var resPipe = src_sh.pipe(zip_files_sh).pipe(dst_sh);

    //cb(); // Коллбек, который нужно вызвать при завершении задачи
    return resPipe; // Либо мы можем вернуть pipe для отслеживания завершения
    //resPipe.end(cb); // Либо мы можем просто назначить коллбек, для оповещения о завершении (не работает)
}

function waitExample(cb){
    console.log("Before wait");
    const emitter = new events.EventEmitter();
    // Emit has to happen async otherwise gulp isn't listening yet
    // Вызвать у эмиттера через время событие finish
    var completeEvent = () => {
        console.log("After wait");
        emitter.emit('finish'); // Так выбрасывается событие
    };
    setTimeout(completeEvent, 1000);
    
    //return emitter; // Можно вернуть
    emitter.on("finish", cb) // А можно просто назначить коллбек
}

function chilpProcess(cb){
    console.log("Before child");
    var childOut = (failedStatus, stdout, stderr)=>{
        if(!failedStatus){
            console.log("After child: " + stdout.slice(0, -1));
            cb();
        }else{
            //console.error("Child error: " + stderr.slice(0, -1));
            cb(new Error(stderr.slice(0, -1)));
        }
    };
    var result = chilp_process.exec("date", childOut);
    //return result; // Можно вернуть
}

// TODO: как делать цепочки между вызовами??
function observableTask() {
    return rxjs.range(0, 5);
}  

function passingCallback(cb) {
    // Асинхронным образом проверяем доступность данного файлика
    fs.access('gulpfile.js', cb);
}

// TODO: Как пользоваться async / await
async function asyncAwaitTask(cb) {
    // Получим поле version из json
    console.log("Before read");
    const { version } = fs.readFileSync('package.json');
    console.log(version);
    await Promise.resolve('some result');
    console.log("After await");
}

////////////////////////////////////////////////////////////////////////////////////////////////////

var cleanSeries = gulp.series(
    defaultTask, 
    clean,
);
var defaultSeries = gulp.series(
    defaultTask, 
    clean, 
    gulp.parallel(buildSh, buildTxt), 
    waitExample, 
    chilpProcess, 
    observableTask, 
    passingCallback,
    asyncAwaitTask,
);

exports.clean = cleanSeries;
exports.default = defaultSeries;
exports.watch_txt = function() {
    // ignoreInitial - запускает задачу сразу же после старта один раз
    // queue: false - будет конкурентно запускать задачу на каждое изменение
    var params = {
        events:"all", 
        ignoreInitial: false,
        queue: true,
        delay: 300,
    };
    gulp.watch('src/*.txt', params, defaultSeries);
};