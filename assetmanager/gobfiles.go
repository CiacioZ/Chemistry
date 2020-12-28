package assetmanager

import (
	"bytes"
	"chemistry/sdk"
	"encoding/base64"
	"encoding/gob"
	"fmt"
	"io"
	"io/ioutil"
	"os"
)

const DefaultGobIndexFilename = "resources.idx"
const DefaultGobDataFilename = "resources.dat"

type datahandler struct {
	indexfile string
	datafile  string

	dataindex map[string]dataindex
}

type dataindex struct {
	Index  int64
	Lenght int64
}

func NewGobFileDataHandler(indexfile string, datafile string) sdk.ResourceHandler {

	fmt.Println("Initialize Asset Manager: Gob index files")

	datahandler := datahandler{
		indexfile: indexfile,
		datafile:  datafile,
	}

	datahandler.loadIndex()

	return datahandler
}

func (d datahandler) loadIndex() {
	if _, err := os.Stat(d.indexfile); !os.IsNotExist(err) {
		f, err := ioutil.ReadFile(d.indexfile)
		if err != nil {
			panic(err)
		}
		d.dataindex = make(map[string]dataindex, 0)
		idx := string(f)
		if len(idx) > 0 {
			fromGOB64(idx, &d.dataindex)
		}
	} else {
		idxf, err := os.Create(d.indexfile)
		if err != nil {
			panic(err)
		}
		defer idxf.Close()
		d.dataindex = make(map[string]dataindex, 0)
		datf, err := os.Create(d.datafile)
		if err != nil {
			panic(err)
		}
		defer datf.Close()
	}

}

func (d datahandler) AddResource(ID string, obj interface{}) {

	data := toGOB64(obj)

	stat, err := os.Stat(d.datafile)
	if err != nil {
		panic(err)
	}

	d.dataindex[ID] = dataindex{
		Index:  stat.Size(),
		Lenght: int64(len(data)),
	}

	datf, err := os.OpenFile(d.datafile, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		panic(err)
	}

	defer datf.Close()

	if _, err = datf.WriteString(data); err != nil {
		panic(err)
	}

	idxf, err := os.OpenFile(d.indexfile, os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		panic(err)
	}

	if _, err = idxf.WriteString(toGOB64(d.dataindex)); err != nil {
		panic(err)
	}

	defer idxf.Close()
}

func (d datahandler) GetResource(ID string, obj interface{}) {

	di := d.dataindex[ID]

	f, err := os.Open(d.datafile)
	if err != nil {
		panic(err)
	}

	_, err = f.Seek(di.Index, 0)
	if err != nil {
		panic(err)
	}

	b := make([]byte, di.Lenght)
	_, err = io.ReadFull(f, b)
	if err != nil {
		panic(err)
	}

	data := string(b)

	fromGOB64(data, obj)
}

func (d datahandler) UpdateResource(ID string, obj interface{}) {
	d.DeleteResource(ID)

	d.AddResource(ID, obj)
}

func (d datahandler) DeleteResource(ID string) {
	delete(d.dataindex, ID)
}

func toGOB64(t interface{}) string {
	b := bytes.Buffer{}
	e := gob.NewEncoder(&b)
	err := e.Encode(t)
	if err != nil {
		fmt.Println(`failed gob Encode`, err)
	}
	return base64.StdEncoding.EncodeToString(b.Bytes())
}

func fromGOB64(str string, t interface{}) {

	by, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		fmt.Println(`failed base64 Decode`, err)
	}
	b := bytes.Buffer{}
	b.Write(by)
	d := gob.NewDecoder(&b)
	err = d.Decode(t)
	if err != nil {
		fmt.Println(`failed gob Decode`, err)
	}
}
