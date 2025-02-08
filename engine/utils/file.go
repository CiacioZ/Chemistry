package utils

import (
	"embed"
	"fmt"
)

func ReadMultipleData(folder embed.FS, paths []string) [][]byte {
	data := make([][]byte, len(paths))

	for i, path := range paths {
		data[i], _ = folder.ReadFile(path)
	}

	return data
}

func ReadData(folder embed.FS, path string) []byte {

	fileData, _ := folder.ReadFile(path)

	if len(fileData) == 0 {
		panic(fmt.Sprintf("File '%s' not found", path))
	}

	return fileData
}
