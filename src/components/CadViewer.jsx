import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { calculateBoundingBox } from '../services/geometryUtils';

const CadViewer = ({ entities, dimensions, theme }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(0);

  // Helper to create text sprite
  const createTextSprite = (message, color) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // High res canvas for sharp text
    const fontSize = 48;
    context.font = `Bold ${fontSize}px Arial`;
    const metrics = context.measureText(message);
    const textWidth = metrics.width;
    
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 20;
    
    context.font = `Bold ${fontSize}px Arial`;
    context.fillStyle = color;
    context.fillText(message, 10, fontSize);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Better scaling
    
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    
    // Scale sprite to world units (approximate)
    const scaleFactor = 0.5 * (message.length * 0.5); 
    sprite.scale.set(canvas.width / 40, canvas.height / 40, 1);
    
    return sprite;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(theme.background);

    // 2. Setup Camera (Orthographic for CAD)
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.OrthographicCamera(
      width / -2, width / 2, height / 2, height / -2, 1, 10000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // 2D CAD usually just pans/zooms
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controlsRef.current = controls;

    // 5. Grid Helper
    const gridHelper = new THREE.GridHelper(2000, 100, new THREE.Color(theme.grid), new THREE.Color(theme.grid));
    gridHelper.rotation.x = Math.PI / 2; // Rotate to lie on XY plane
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []); // Only init once

  // Update scene when props change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    // Update theme background
    scene.background = new THREE.Color(theme.background);

    // Clear previous entities and dimensions
    for(let i = scene.children.length - 1; i >= 0; i--) { 
        if(scene.children[i].type !== 'GridHelper') 
            scene.remove(scene.children[i]); 
    }

    // 1. Render Entities
    const material = new THREE.LineBasicMaterial({ color: theme.lines });
    
    entities.forEach(ent => {
      if (ent.type === 'LINE') {
        const points = [
          new THREE.Vector3(ent.start.x, ent.start.y, 0),
          new THREE.Vector3(ent.end.x, ent.end.y, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      } else if (ent.type === 'LWPOLYLINE') {
        const points = ent.vertices.map(v => new THREE.Vector3(v.x, v.y, 0));
        if (ent.closed) points.push(points[0]);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      } else if (ent.type === 'CIRCLE') {
        const curve = new THREE.EllipseCurve(
            ent.center.x, ent.center.y,
            ent.radius, ent.radius,
            0, 2 * Math.PI,
            false, 0
        );
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const circle = new THREE.Line(geometry, material);
        scene.add(circle);
      }
    });

    // 2. Render Dimensions
    const dimLineMat = new THREE.LineDashedMaterial({ 
      color: theme.dimensions, 
      dashSize: 1, 
      gapSize: 0.5,
      opacity: 0.7,
      transparent: true 
    });

    dimensions.forEach(dim => {
      if (dim.type === 'LINEAR' || dim.type === 'BOUNDING') {
         // Dimension line logic
         const offset = 2; // Distance from line
         const nx = dim.normal?.x || 0;
         const ny = dim.normal?.y || 0;
         
         // Start and End offset points
         const p1 = new THREE.Vector3(dim.start.x + nx * offset, dim.start.y + ny * offset, 0);
         const p2 = new THREE.Vector3(dim.end.x + nx * offset, dim.end.y + ny * offset, 0);

         // Draw the main dimension line
         const dimGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
         const dimLine = new THREE.Line(dimGeo, dimLineMat);
         dimLine.computeLineDistances(); // Required for LineDashedMaterial
         scene.add(dimLine);

         // Draw extension lines (from object to dim line)
         const extMat = new THREE.LineBasicMaterial({ color: theme.dimensions, opacity: 0.3, transparent: true });
         const ext1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(dim.start.x, dim.start.y, 0),
            p1
         ]);
         const ext2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(dim.end.x, dim.end.y, 0),
            p2
         ]);
         scene.add(new THREE.Line(ext1, extMat));
         scene.add(new THREE.Line(ext2, extMat));

         // Text
         const sprite = createTextSprite(dim.label, theme.text);
         if (sprite) {
             sprite.position.set((p1.x + p2.x)/2 + nx * 1, (p1.y + p2.y)/2 + ny * 1, 0);
             scene.add(sprite);
         }
      } else if (dim.type === 'RADIUS') {
          const p1 = new THREE.Vector3(dim.start.x, dim.start.y, 0);
          const p2 = new THREE.Vector3(dim.end.x, dim.end.y, 0);
          
          const dimGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const dimLine = new THREE.Line(dimGeo, dimLineMat);
          dimLine.computeLineDistances();
          scene.add(dimLine);

          const sprite = createTextSprite(dim.label, theme.accent);
          if (sprite) {
              sprite.position.set(dim.midpoint.x, dim.midpoint.y, 0);
              scene.add(sprite);
          }

      } else if (dim.type === 'ANGULAR') {
          // Simplified angular: Just a label at the vertex for now
          const sprite = createTextSprite(dim.label, theme.accent);
          if (sprite && dim.midpoint) {
              sprite.position.set(dim.midpoint.x, dim.midpoint.y + 2, 0);
              scene.add(sprite);
          }
      }
    });

    // 3. Center Camera
    if (entities.length > 0) {
      const bbox = calculateBoundingBox(entities);
      if (bbox.width > 0 && cameraRef.current) {
        // Zoom fit
        const cam = cameraRef.current;
        const padding = 1.2;
        cam.zoom = Math.min(
            (cam.right - cam.left) / (bbox.width * padding),
            (cam.top - cam.bottom) / (bbox.height * padding)
        );
        cam.position.set(bbox.center.x, bbox.center.y, 100);
        cam.updateProjectionMatrix();
        controlsRef.current?.target.set(bbox.center.x, bbox.center.y, 0);
        controlsRef.current?.update();
      }
    }

  }, [entities, dimensions, theme]);

  // Animation Loop
  const animate = () => {
    frameIdRef.current = requestAnimationFrame(animate);
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  useEffect(() => {
    animate();
    return () => cancelAnimationFrame(frameIdRef.current);
  }, []);

  // Handle Resize
  useEffect(() => {
     const handleResize = () => {
         if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
         const w = containerRef.current.clientWidth;
         const h = containerRef.current.clientHeight;
         const cam = cameraRef.current;
         cam.left = -w / 2;
         cam.right = w / 2;
         cam.top = h / 2;
         cam.bottom = -h / 2;
         cam.updateProjectionMatrix();
         rendererRef.current.setSize(w, h);
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full cursor-move relative overflow-hidden" />
  );
};

export default CadViewer;