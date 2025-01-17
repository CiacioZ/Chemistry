
$origina_GOOS_lValue = $Env:GOOS
$Env:GOOS = "js"

$origina_GOARCH_lValue = $Env:GOARCH
$Env:GOARCH = "wasm"

go build -o ./cmd/web/game.wasm ./cmd/main/main.go

$Env:GOOS = $origina_GOOS_lValue
$Env:GOARCH = $origina_GOARCH_lValue