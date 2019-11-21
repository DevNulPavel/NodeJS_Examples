install_deps:
	npm install

build: clean
	tsc
	cp .gitignore build/src/
	cp package.json build/src/
	cp package-lock.json build/src/
	mv build/src build/app

replace_app: build
	rm -rf ../app
	mv build/app ../

clean:
	rm -rf ./build/*

backup_keys:
	mkdir -p backup/ && \
	rm backup/* && \
	zip -er backup/test_keys.zip ./test_keys/ ./scripts/
