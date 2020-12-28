package sdk

type ResourceHandler interface {
	AddResource(ID string, obj interface{})

	GetResource(ID string, obj interface{})

	UpdateResource(ID string, obj interface{})

	DeleteResource(ID string)
}

type GameLogicHandler interface {
}

type PresentationHandler interface {
	CreateWindow(width int32, height int32)
}
