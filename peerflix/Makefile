INSTALL_DEPS:
	npm install

TEST:
	node app.js "magnet:?xt=urn:btih:DBABF77C106945FD1B19E1C3E16019B57C848C69&tr=http%3A%2F%2Fbt.t-ru.org%2Fann%3Fmagnet" --vlc
	
TEST_FILES_LIST:
	node app.js "magnet:?xt=urn:btih:DBABF77C106945FD1B19E1C3E16019B57C848C69&tr=http%3A%2F%2Fbt.t-ru.org%2Fann%3Fmagnet" --list --vlc

PROFILE:
	node --inspect app.js "magnet:?xt=urn:btih:DBABF77C106945FD1B19E1C3E16019B57C848C69&tr=http%3A%2F%2Fbt.t-ru.org%2Fann%3Fmagnet" --list --vlc
	# Затем надо открыть в Chrome http://127.0.0.1:9229/json
	# Получить оттуда ссылку на путь к DevTool и открыть ее в новой вкладке
	# После этого можно начать скачивать