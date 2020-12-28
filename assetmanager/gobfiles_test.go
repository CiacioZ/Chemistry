package assetmanager

import (
	"chemistry/sdk"
	"testing"
)

func Test_Encode(t *testing.T) {

	obj := sdk.Image{
		ID:       1,
		FileName: "Nome",
		Data:     []byte{},
	}

	encoded := toGOB64(obj)

	t.Errorf("Encoded: %s", encoded)
}

func Test_Deode(t *testing.T) {

	encoded := "K/+BAwEBBUltYWdlAf+CAAEDAQJJRAEEAAEETmFtZQEMAAEDSW1nAQoAAAAL/4IBAgEETm9tZQA="

	obj := &sdk.Image{}

	fromGOB64(encoded, obj)

	t.Errorf("Decoded: %+v", obj)
}
