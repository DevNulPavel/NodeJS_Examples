all: clean
	tsc

clean:
	rm -rf ./build/*

backup_keys:
	mkdir -p backup/ && \
	rm backup/* && \
	zip -er backup/test_keys.zip ./test_keys/ ./scripts/