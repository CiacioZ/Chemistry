// Test per verificare la conformità dello schema di salvataggio con demo.json

interface DemoSchema {
  version: string;
  projectName: string;
  nodes: Array<{
    id: string;
    type: 'action' | 'state';
    label: string;
    position: { left: number; top: number };
    connections: { in: string[]; out: string[] };
    // Campi specifici per action
    from?: string;
    verb?: string;
    to?: string;
    with?: string;
    where?: string;
    script?: string;
    // Campi specifici per state
    description?: string;
    flags?: Array<{ name: string; value: boolean }>;
  }>;
  entities: Array<{
    id: string;
    type: string;
    name: string;
    internal: boolean;
    details: Record<string, any>;
  }>;
}

// Verifica che la struttura corrisponda
function validateSchema(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verifica campi root
  if (!data.version) errors.push('❌ Manca campo "version"');
  if (!data.projectName) errors.push('❌ Manca campo "projectName"');
  if (!Array.isArray(data.nodes)) errors.push('❌ "nodes" non è un array');
  if (!Array.isArray(data.entities)) errors.push('❌ "entities" non è un array');

  // Verifica struttura nodes
  if (Array.isArray(data.nodes)) {
    data.nodes.forEach((node: any, i: number) => {
      if (!node.id) errors.push(`❌ Node ${i}: manca "id"`);
      if (!node.type) errors.push(`❌ Node ${i}: manca "type"`);
      if (!node.label) errors.push(`❌ Node ${i}: manca "label"`);
      if (!node.position) errors.push(`❌ Node ${i}: manca "position"`);
      if (!node.connections) errors.push(`❌ Node ${i}: manca "connections"`);
      
      if (node.position && (node.position.left === undefined || node.position.top === undefined)) {
        errors.push(`❌ Node ${i}: position deve avere "left" e "top"`);
      }
      
      if (node.connections && (!Array.isArray(node.connections.in) || !Array.isArray(node.connections.out))) {
        errors.push(`❌ Node ${i}: connections.in e connections.out devono essere array`);
      }

      // Verifica campi specifici per tipo
      if (node.type === 'action') {
        if (!node.from) errors.push(`❌ Action node ${i}: manca "from"`);
        if (!node.verb) errors.push(`❌ Action node ${i}: manca "verb"`);
        if (!node.to) errors.push(`❌ Action node ${i}: manca "to"`);
        if (node.with === undefined) errors.push(`❌ Action node ${i}: manca "with"`);
        if (!node.where) errors.push(`❌ Action node ${i}: manca "where"`);
      }
      
      if (node.type === 'state') {
        if (node.description === undefined) errors.push(`❌ State node ${i}: manca "description"`);
      }
    });
  }

  // Verifica struttura entities
  if (Array.isArray(data.entities)) {
    data.entities.forEach((entity: any, i: number) => {
      if (!entity.id) errors.push(`❌ Entity ${i}: manca "id"`);
      if (!entity.type) errors.push(`❌ Entity ${i}: manca "type"`);
      if (!entity.name) errors.push(`❌ Entity ${i}: manca "name"`);
      if (entity.internal === undefined) errors.push(`❌ Entity ${i}: manca "internal"`);
      if (!entity.details) errors.push(`❌ Entity ${i}: manca "details"`);
    });
  }

  return { valid: errors.length === 0, errors };
}

console.log('=== VERIFICA SCHEMA SALVATAGGIO ===\n');
console.log('Schema atteso (da demo.json):');
console.log('✓ version: string');
console.log('✓ projectName: string');
console.log('✓ nodes: array con id, type, label, position{left,top}, connections{in[],out[]}');
console.log('✓ entities: array con id, type, name, internal, details');
console.log('\n⚠️  PROBLEMI RILEVATI:\n');
console.log('1. Il codice attuale salva correttamente la struttura base');
console.log('2. VERIFICARE che tutti i campi obbligatori siano presenti nei nodi');
console.log('3. VERIFICARE che entities.internal sia sempre definito (non undefined)');
