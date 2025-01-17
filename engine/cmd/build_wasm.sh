#!/bin/sh

# Imposta le variabili d'ambiente
export GOOS=js
export GOARCH=wasm

# Compila il programma
go build -o ./web/static/game.wasm ./desktop/main.go

# Rimuovi le variabili d'ambiente
unset GOOS
unset GOARCH