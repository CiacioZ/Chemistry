package utils

import (
	"io"
	"os"
)

func ReadMultipleData(paths []string) [][]byte {
	data := make([][]byte, len(paths))

	for i, path := range paths {
		data[i] = ReadData(path)
	}

	return data
}

func ReadData(path string) []byte {
	file, err := os.Open(path)

	if err != nil {
		defer file.Close()
		panic(err)
	}

	fileData, err := io.ReadAll(file)
	if err != nil {
		defer file.Close()
		panic(err)
	}

	return fileData
}
