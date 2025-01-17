package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./cmd/web")))
	fmt.Println("Start Serving...")
	http.ListenAndServe(":9090", nil)
	fmt.Println("Stop Serving...")
}
