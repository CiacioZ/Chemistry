package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	fmt.Println("Start Serving... on Port: 9090")
	http.ListenAndServe(":9090", nil)
	fmt.Println("Stop Serving...")
}
