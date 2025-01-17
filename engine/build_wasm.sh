#!/bin/sh

# Imposta le variabili d'ambiente
export GOOS=js
export GOARCH=wasm

# Compila il programma
go build -o ./cmd/web/game.wasm ./cmd/main/main.go

# Rimuovi le variabili d'ambiente
unset GOOS
unset GOARCH