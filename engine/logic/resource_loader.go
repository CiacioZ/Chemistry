package logic

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
)

// ResourceManager handles on-demand loading of resources
type ResourceManager struct {
	binFilePath string
	mutex       sync.RWMutex
}

// NewResourceManager creates a new resource manager
func NewResourceManager(binFilePath string) *ResourceManager {
	return &ResourceManager{
		binFilePath: binFilePath,
	}
}

// LoadBinaryData loads binary data from the resource file using BinaryRef
func (rm *ResourceManager) LoadBinaryData(ref *BinaryRef) ([]byte, error) {
	if ref == nil {
		return nil, nil
	}

	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	file, err := os.Open(rm.binFilePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	_, err = file.Seek(ref.Offset, io.SeekStart)
	if err != nil {
		return nil, err
	}

	data := make([]byte, ref.Size)
	_, err = io.ReadFull(file, data)
	return data, err
}

// LoadPackagedGameData loads the new packaged game data format with on-demand resource loading
func (g *Game) LoadPackagedGameData(dataFilePath string) error {
	// Determine binary file path
	binFilePath := dataFilePath[:len(dataFilePath)-4] + "_data.bin"

	// Initialize resource manager
	g.resourceManager = NewResourceManager(binFilePath)

	// Load encrypted JSON index
	encryptedData, err := os.ReadFile(dataFilePath)
	if err != nil {
		return fmt.Errorf("error reading encrypted data file: %v", err)
	}

	// Extract project name from file path for decryption key
	projectName := extractProjectName(dataFilePath)

	// Decrypt JSON data
	jsonData, err := decryptJSON(encryptedData, projectName)
	if err != nil {
		return fmt.Errorf("error decrypting JSON data: %v", err)
	}

	// Parse JSON index
	var packagedData PackagedGameData
	if err := json.Unmarshal(jsonData, &packagedData); err != nil {
		return fmt.Errorf("error unmarshalling JSON data: %v", err)
	}

	// Store packaged data for on-demand loading
	g.packagedData = &packagedData

	// Map basic data structure (without loading binary resources)
	return g.mapPackagedDataIndex(packagedData)
}

func decryptJSON(encryptedData []byte, projectName string) ([]byte, error) {
	hash := sha256.Sum256([]byte(projectName))
	key := hash[:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(encryptedData) < nonceSize {
		return nil, fmt.Errorf("encrypted data too short")
	}

	nonce, ciphertext := encryptedData[:nonceSize], encryptedData[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

func extractProjectName(filePath string) string {
	base := filePath[len(filePath)-1:]
	for i := len(filePath) - 1; i >= 0; i-- {
		if filePath[i] == '/' || filePath[i] == '\\' {
			base = filePath[i+1:]
			break
		}
	}

	if len(base) > 13 && base[len(base)-13:] == "_packaged.dat" {
		return base[:len(base)-13]
	}
	return "demo3"
}
