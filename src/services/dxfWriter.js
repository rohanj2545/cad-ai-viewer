/**
 * Generates a standard AutoCAD R12 (AC1009) DXF file.
 */
export const generateDXF = (entities, dimensions) => {
  const nl = '\n';
  let output = '';

  // 1. HEADER SECTION
  output += `0${nl}SECTION${nl}`;
  output += `2${nl}HEADER${nl}`;
  output += `9${nl}$ACADVER${nl}1${nl}AC1009${nl}`; // R12 Version
  output += `9${nl}$INSBASE${nl}10${nl}0.0${nl}20${nl}0.0${nl}30${nl}0.0${nl}`;
  output += `9${nl}$EXTMIN${nl}10${nl}0.0${nl}20${nl}0.0${nl}30${nl}0.0${nl}`;
  output += `9${nl}$EXTMAX${nl}10${nl}1000.0${nl}20${nl}1000.0${nl}30${nl}0.0${nl}`;
  output += `0${nl}ENDSEC${nl}`;

  // 2. TABLES SECTION (Required for layers)
  output += `0${nl}SECTION${nl}`;
  output += `2${nl}TABLES${nl}`;
  
  // LTYPE Table
  output += `0${nl}TABLE${nl}2${nl}LTYPE${nl}70${nl}1${nl}`;
  output += `0${nl}LTYPE${nl}2${nl}CONTINUOUS${nl}70${nl}64${nl}3${nl}Solid line${nl}72${nl}65${nl}73${nl}0${nl}40${nl}0.0${nl}`;
  output += `0${nl}ENDTAB${nl}`;

  // LAYER Table
  output += `0${nl}TABLE${nl}2${nl}LAYER${nl}70${nl}6${nl}`;
  output += `0${nl}LAYER${nl}2${nl}0${nl}70${nl}0${nl}62${nl}7${nl}6${nl}CONTINUOUS${nl}`; // Default Layer
  output += `0${nl}LAYER${nl}2${nl}DIMENSIONS${nl}70${nl}0${nl}62${nl}3${nl}6${nl}CONTINUOUS${nl}`; // Dimensions Layer (Green/Cyan usually, 3 is Green)
  output += `0${nl}ENDTAB${nl}`;

  output += `0${nl}ENDSEC${nl}`;

  // 3. ENTITIES SECTION
  output += `0${nl}SECTION${nl}`;
  output += `2${nl}ENTITIES${nl}`;

  // Helper for coordinates
  const writePoint = (x, y, z = 0) => {
    return `10${nl}${x}${nl}20${nl}${y}${nl}30${nl}${z}${nl}`;
  };

  const writeLine = (x1, y1, x2, y2, layer = '0', color = 256) => {
    let s = `0${nl}LINE${nl}8${nl}${layer}${nl}`;
    if (color !== 256) s += `62${nl}${color}${nl}`;
    s += `10${nl}${x1}${nl}20${nl}${y1}${nl}30${nl}0.0${nl}`;
    s += `11${nl}${x2}${nl}21${nl}${y2}${nl}31${nl}0.0${nl}`;
    return s;
  };

  const writeText = (x, y, text, height, rotation, layer = '0') => {
    // Basic TEXT entity
    let s = `0${nl}TEXT${nl}8${nl}${layer}${nl}`;
    s += `10${nl}${x}${nl}20${nl}${y}${nl}30${nl}0.0${nl}`;
    s += `40${nl}${height}${nl}`;
    s += `1${nl}${text}${nl}`;
    s += `50${nl}${rotation}${nl}`;
    return s;
  };

  // --- Write Original Entities ---
  entities.forEach(ent => {
    if (ent.type === 'LINE') {
      output += writeLine(ent.start.x, ent.start.y, ent.end.x, ent.end.y);
    } 
    else if (ent.type === 'LWPOLYLINE') {
      // R12 does not support LWPOLYLINE. Convert to POLYLINE (old style).
      output += `0${nl}POLYLINE${nl}8${nl}0${nl}66${nl}1${nl}`; // 66=1 means vertices follow
      output += `70${nl}${ent.closed ? 1 : 0}${nl}`;
      output += `10${nl}0.0${nl}20${nl}0.0${nl}30${nl}0.0${nl}`; // Dummy point for polyline header

      ent.vertices.forEach(v => {
        output += `0${nl}VERTEX${nl}8${nl}0${nl}`;
        output += writePoint(v.x, v.y);
      });

      output += `0${nl}SEQEND${nl}8${nl}0${nl}`;
    } 
    else if (ent.type === 'CIRCLE') {
      output += `0${nl}CIRCLE${nl}8${nl}0${nl}`;
      output += writePoint(ent.center.x, ent.center.y);
      output += `40${nl}${ent.radius}${nl}`;
    }
  });

  // --- Write Dimensions ---
  const dimLayer = 'DIMENSIONS';
  dimensions.forEach(dim => {
    if (dim.type === 'LINEAR' || dim.type === 'BOUNDING') {
      const offset = 2; 
      const nx = dim.normal?.x || 0;
      const ny = dim.normal?.y || 0;
      const p1 = { x: dim.start.x + nx * offset, y: dim.start.y + ny * offset };
      const p2 = { x: dim.end.x + nx * offset, y: dim.end.y + ny * offset };

      // Dimension Line
      output += writeLine(p1.x, p1.y, p2.x, p2.y, dimLayer, 3); // 3 = Green
      
      // Extension Lines
      output += writeLine(dim.start.x, dim.start.y, p1.x, p1.y, dimLayer, 3);
      output += writeLine(dim.end.x, dim.end.y, p2.x, p2.y, dimLayer, 3);

      // Text
      const midX = (p1.x + p2.x) / 2 + nx;
      const midY = (p1.y + p2.y) / 2 + ny;
      let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      if (angle > 90 || angle < -90) angle += 180;
      
      output += writeText(midX, midY, dim.label, 1.0, angle, dimLayer);

    } else if (dim.type === 'RADIUS') {
        output += writeLine(dim.start.x, dim.start.y, dim.end.x, dim.end.y, dimLayer, 1); // 1 = Red
        output += writeText(dim.midpoint.x, dim.midpoint.y + 1, dim.label, 1.0, 0, dimLayer);
    
    } else if (dim.type === 'ANGULAR' && dim.midpoint) {
        output += writeText(dim.midpoint.x, dim.midpoint.y, dim.label, 1.0, 0, dimLayer);
    }
  });

  output += `0${nl}ENDSEC${nl}`;
  output += `0${nl}EOF${nl}`;
  
  return output;
};