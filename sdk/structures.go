package sdk

type game struct {
	resourcemanager     ResourceHandler
	gamelogicmanager    GameLogicHandler
	presentationmanager PresentationHandler
}

type Image struct {
	ID       int
	FileName string
	Data     []byte
}

type Script struct {
	ID       int
	FileName string
	Data     []byte
}

type Sound struct {
	ID       int
	FileName string
	Data     []byte
}

type Font struct {
	ID       int
	FileName string
	Data     []byte
}
