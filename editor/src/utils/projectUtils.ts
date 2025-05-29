import { Entity, Node, ProjectFile, LocationEntity, CharacterEntity, ItemEntity, ScriptEntity, FontEntity, AnyEntity } from '../components/flow-diagram/types'; // Assicurati che il percorso sia corretto

export const groupEntitiesForSave = (allEntities: AnyEntity[], diagramNodes?: Node[]): ProjectFile => {
  const projectData: ProjectFile = {
    locations: [],
    characters: [],
    items: [],
    scripts: [],
    fonts: [],
    diagramNodes: diagramNodes || [], // Includi i nodi se forniti
  };

  allEntities.forEach(entity => {
    switch (entity.type) {
      case 'Location':
        projectData.locations.push(entity as LocationEntity);
        break;
      case 'Character':
        projectData.characters.push(entity as CharacterEntity);
        break;
      case 'Item':
        projectData.items.push(entity as ItemEntity);
        break;
      case 'Script':
        projectData.scripts.push(entity as ScriptEntity);
        break;
      case 'Font':
        projectData.fonts.push(entity as FontEntity);
        break;
      case 'Action': // Azioni potrebbero essere gestite diversamente (es. inline nei nodi)
        // Se non devono essere in un array separato, possiamo ignorarle qui.
        // console.log(`ActionEntity ${entity.id} encountered, not adding to separate list.`);
        break;
      // case 'Action': // Se decidi di salvare le ActionEntity separatamente
      //   if (!projectData.actions) projectData.actions = [];
      //   projectData.actions.push(entity as ActionEntity);
      //   break;
      default:
        // Controlla se entity ha una proprietà 'type' prima di provare ad accedervi
        const entityType = (entity as AnyEntity)?.type || 'unknown';
        console.warn(`Unhandled entity type during save: ${entityType}`);
        break;
    }
  });

  return projectData;
}; 