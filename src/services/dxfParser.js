/**
 * Parses a simplified subset of DXF format focused on LINE, LWPOLYLINE, POLYLINE (R12), and CIRCLE.
 */
export const parseDXF = (dxfContent) => {
  const lines = dxfContent.split(/\r\n|\r|\n/);
  const entities = [];
  
  let isEntitiesSection = false;
  let currentEntity = null;
  // State for R12 Polyline parsing
  let isParsingPolyline = false; 
  
  let i = 0;
  while (i < lines.length) {
    const code = lines[i].trim();
    const value = lines[i + 1]?.trim();
    
    if (!code || !value) {
      i += 2;
      continue;
    }

    if (code === '0' && value === 'SECTION') {
      if (lines[i + 2]?.trim() === '2' && lines[i + 3]?.trim() === 'ENTITIES') {
        isEntitiesSection = true;
        i += 4;
        continue;
      }
    }

    if (code === '0' && value === 'ENDSEC') {
      isEntitiesSection = false;
    }

    if (isEntitiesSection) {
      if (code === '0') {
        // Handle Entity Transitions
        const isVertex = value === 'VERTEX';
        const isSeqEnd = value === 'SEQEND';

        // If we are parsing a POLYLINE and hit VERTEX, continue adding to current entity
        if (isParsingPolyline && isVertex) {
           // Do nothing here, process props below
        } 
        else if (isParsingPolyline && isSeqEnd) {
           // End of POLYLINE
           if (currentEntity && currentEntity.type === 'LWPOLYLINE') { // mapped internal type
               entities.push(currentEntity);
           }
           currentEntity = null;
           isParsingPolyline = false;
        }
        else {
            // Save previous entity if it wasn't a polyline we are currently building
            if (currentEntity && !isParsingPolyline) {
                if (currentEntity.type === 'LINE' && currentEntity.start && currentEntity.end) {
                    entities.push(currentEntity);
                } else if (currentEntity.type === 'LWPOLYLINE' && currentEntity.vertices?.length > 0) {
                    entities.push(currentEntity);
                } else if (currentEntity.type === 'CIRCLE' && currentEntity.center && currentEntity.radius) {
                    entities.push(currentEntity);
                }
            }

            // Start new entity
            if (value === 'LINE') {
                currentEntity = { type: 'LINE', start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } };
            } else if (value === 'LWPOLYLINE') {
                currentEntity = { type: 'LWPOLYLINE', vertices: [], closed: false };
            } else if (value === 'POLYLINE') {
                // R12 Style Polyline - treat as LWPOLYLINE internally
                currentEntity = { type: 'LWPOLYLINE', vertices: [], closed: false };
                isParsingPolyline = true;
            } else if (value === 'CIRCLE') {
                currentEntity = { type: 'CIRCLE', center: { x: 0, y: 0, z: 0 }, radius: 0 };
            } else if (!isVertex && !isSeqEnd) {
                currentEntity = null;
            }
        }
      } else if (currentEntity) {
        // Parse properties
        
        if (currentEntity.type === 'LINE') {
          const l = currentEntity;
          if (code === '10') l.start.x = parseFloat(value);
          if (code === '20') l.start.y = parseFloat(value);
          if (code === '30') l.start.z = parseFloat(value);
          if (code === '11') l.end.x = parseFloat(value);
          if (code === '21') l.end.y = parseFloat(value);
          if (code === '31') l.end.z = parseFloat(value);
        } else if (currentEntity.type === 'LWPOLYLINE') {
           const p = currentEntity;
           
           if (isParsingPolyline) {
               if (code === '10') {
                    p.vertices.push({ x: parseFloat(value), y: 0, z: 0 });
               }
               if (code === '20') {
                   const lastV = p.vertices[p.vertices.length - 1];
                   if (lastV) lastV.y = parseFloat(value);
               }
               if (code === '70') { // Flags on the header
                   const flag = parseInt(value, 10);
                   if ((flag & 1) === 1) p.closed = true;
               }
           } else {
               // Standard LWPOLYLINE
               if (code === '10') {
                    p.vertices.push({ x: parseFloat(value), y: 0, z: 0 }); 
               }
               if (code === '20') {
                    const lastV = p.vertices[p.vertices.length - 1];
                    if (lastV) lastV.y = parseFloat(value);
               }
               if (code === '70') {
                    const flag = parseInt(value, 10);
                    p.closed = (flag & 1) === 1;
               }
           }
        } else if (currentEntity.type === 'CIRCLE') {
          const c = currentEntity;
          if (code === '10') c.center.x = parseFloat(value);
          if (code === '20') c.center.y = parseFloat(value);
          if (code === '30') c.center.z = parseFloat(value);
          if (code === '40') c.radius = parseFloat(value);
        }
      }
    }
    
    i += 2;
  }

  // Push last entity
  if (currentEntity && !isParsingPolyline) {
     if (currentEntity.type === 'LINE' && currentEntity.start && currentEntity.end) {
        entities.push(currentEntity);
      } else if (currentEntity.type === 'LWPOLYLINE' && currentEntity.vertices?.length > 0) {
        entities.push(currentEntity);
      } else if (currentEntity.type === 'CIRCLE' && currentEntity.center && currentEntity.radius) {
        entities.push(currentEntity);
      }
  }

  return entities;
};