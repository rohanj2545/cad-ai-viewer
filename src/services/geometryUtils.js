// Helper to calculate distance
const dist = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

// Helper to get midpoint
const mid = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: (p1.z || 0 + (p2.z || 0)) / 2 });

// Helper to get normal vector (2D)
const getNormal = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x: -dy / len, y: dx / len };
};

const arePointsEqual = (p1, p2, tolerance = 0.001) => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
};

export const calculateBoundingBox = (entities) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const updateBounds = (p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };

  entities.forEach(ent => {
    if (ent.type === 'LINE') {
      updateBounds(ent.start);
      updateBounds(ent.end);
    } else if (ent.type === 'LWPOLYLINE') {
      ent.vertices.forEach(updateBounds);
    } else if (ent.type === 'CIRCLE') {
      updateBounds({ x: ent.center.x - ent.radius, y: ent.center.y - ent.radius });
      updateBounds({ x: ent.center.x + ent.radius, y: ent.center.y + ent.radius });
    }
  });

  if (minX === Infinity) {
    return { min: {x:0,y:0}, max: {x:100,y:100}, width: 100, height: 100, center: {x:50, y:50} };
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    width: maxX - minX,
    height: maxY - minY,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  };
};

export const generateDimensions = (entities, config) => {
  const dims = [];
  const bbox = calculateBoundingBox(entities);
  
  // 1. Linear Dimensions
  if (config.linear) {
    entities.forEach(ent => {
      if (ent.type === 'LINE') {
        const length = dist(ent.start, ent.end);
        if (length > 0.01) {
          const normal = getNormal(ent.start, ent.end);
          dims.push({
            type: 'LINEAR',
            start: ent.start,
            end: ent.end,
            value: length,
            midpoint: mid(ent.start, ent.end),
            normal: normal,
            label: length.toFixed(2)
          });
        }
      } else if (ent.type === 'LWPOLYLINE') {
         for(let i=0; i< ent.vertices.length - 1; i++) {
             const p1 = ent.vertices[i];
             const p2 = ent.vertices[i+1];
             const length = dist(p1, p2);
             if (length > 0.01) {
                const normal = getNormal(p1, p2);
                dims.push({
                    type: 'LINEAR',
                    start: p1,
                    end: p2,
                    value: length,
                    midpoint: mid(p1, p2),
                    normal: normal,
                    label: length.toFixed(2)
                  });
             }
         }
         if (ent.closed && ent.vertices.length > 1) {
             const p1 = ent.vertices[ent.vertices.length - 1];
             const p2 = ent.vertices[0];
             const length = dist(p1, p2);
             if (length > 0.01) {
                const normal = getNormal(p1, p2);
                dims.push({
                    type: 'LINEAR',
                    start: p1,
                    end: p2,
                    value: length,
                    midpoint: mid(p1, p2),
                    normal: normal,
                    label: length.toFixed(2)
                  });
             }
         }
      }
    });
  }

  // 2. Bounding Box Dimensions
  if (config.bounding) {
    dims.push({
      type: 'BOUNDING',
      start: { x: bbox.min.x, y: bbox.min.y },
      end: { x: bbox.max.x, y: bbox.min.y },
      value: bbox.width,
      midpoint: { x: bbox.center.x, y: bbox.min.y },
      normal: { x: 0, y: -1 },
      label: `W: ${bbox.width.toFixed(2)}`
    });

    dims.push({
      type: 'BOUNDING',
      start: { x: bbox.min.x, y: bbox.min.y },
      end: { x: bbox.min.x, y: bbox.max.y },
      value: bbox.height,
      midpoint: { x: bbox.min.x, y: bbox.center.y },
      normal: { x: -1, y: 0 },
      label: `H: ${bbox.height.toFixed(2)}`
    });
  }

  // 3. Angular Dimensions (Polyline + Lines sharing vertex)
  if (config.angular) {
    // 3a. Polylines
    entities.forEach(ent => {
        if (ent.type === 'LWPOLYLINE' && ent.vertices.length > 2) {
             for(let i=0; i< ent.vertices.length - 2; i++) {
                 const p1 = ent.vertices[i];
                 const p2 = ent.vertices[i+1]; // Vertex
                 const p3 = ent.vertices[i+2];
                 addAngle(dims, p1, p2, p3);
             }
        }
    });

    // 3b. Intersecting Lines (Vertices)
    const lines = entities.filter(e => e.type === 'LINE');
    // Naive O(N^2) for demo purposes.
    for(let i = 0; i < lines.length; i++) {
        for(let j = i + 1; j < lines.length; j++) {
            const l1 = lines[i];
            const l2 = lines[j];
            
            // Check connectivity
            let common = null;
            let other1 = null;
            let other2 = null;

            if (arePointsEqual(l1.end, l2.start)) { common = l1.end; other1 = l1.start; other2 = l2.end; }
            else if (arePointsEqual(l1.start, l2.end)) { common = l1.start; other1 = l1.end; other2 = l2.start; }
            else if (arePointsEqual(l1.end, l2.end)) { common = l1.end; other1 = l1.start; other2 = l2.start; }
            else if (arePointsEqual(l1.start, l2.start)) { common = l1.start; other1 = l1.end; other2 = l2.end; }

            if (common && other1 && other2) {
                addAngle(dims, other1, common, other2);
            }
        }
    }
  }

  // 4. Radius Dimensions
  if (config.radius) {
      entities.forEach(ent => {
          if (ent.type === 'CIRCLE') {
              // Create a point at 45 degrees
              const angle = Math.PI / 4;
              const edgeX = ent.center.x + Math.cos(angle) * ent.radius;
              const edgeY = ent.center.y + Math.sin(angle) * ent.radius;
              
              dims.push({
                  type: 'RADIUS',
                  start: ent.center,
                  end: { x: edgeX, y: edgeY },
                  midpoint: { x: (ent.center.x + edgeX)/2, y: (ent.center.y + edgeY)/2 },
                  value: ent.radius,
                  label: `R${ent.radius.toFixed(2)}`
              });
          }
      });
  }

  return dims;
};

// Helper to calculate and add angle
const addAngle = (dims, p1, vertex, p3) => {
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
    
    const angleRad = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
    let angleDeg = Math.abs(angleRad * 180 / Math.PI);
    if (angleDeg > 180) angleDeg = 360 - angleDeg;
    
    // Only show significant angles
    if (angleDeg > 1) {
        dims.push({
            type: 'ANGULAR',
            start: p1,
            end: p3,
            midpoint: vertex, 
            value: angleDeg,
            label: `${angleDeg.toFixed(1)}°`
        });
    }
};