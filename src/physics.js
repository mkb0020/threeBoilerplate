import * as THREE from "three";

export class PhysicsBall {
  constructor(scene, camera, renderer, controls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls; // STORE REFERENCE TO ORBIT CONTROLS
    
    // PHYSICS
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0); // FOR VISUAL
    this.gravity = -9.8; // m/s^2 (AFFECTS Y AXIS - PULLS DOWN) 
    this.friction = 0.98; // GROUND FRICTION (0-1, CLOSER TO 1 = LESS FRICTION)
    this.airResistance = 0.99; // AIR DRAG  (0-1, CLOSER TO 1 = LESS DRAG)
    this.bounciness = 0.7; // ENERGY RETAINED AFTER BOUNCE (0-1)
    this.radius = 0.5;
    
    // BALL MESH
    this.mesh = this.createBall();
    this.mesh.position.set(0, 3, 0); // START AT Y=3
    this.scene.add(this.mesh);
    
    // CALCULUS VISUALS !
    this.showTrail = true;
    this.showVelocity = true;
    this.showAcceleration = true;
    this.trailPoints = [];
    this.maxTrailPoints = 50;
    
    // TRAIL
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00FFFF,
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });
    this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailLine);
    
    // VELOCITY ARROW = FIRST DERIVATIVE =  dp/dt)
    this.velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), // DIRECTION
      new THREE.Vector3(0, 0, 0), // ORIGIN
      1, // LENGTH
      0x00FF00, // GREEN
      0.2, // HEAD LENGTH
      0.15  // HEAD WIDTH
    );
    this.scene.add(this.velocityArrow);
    
    // ACCELERATION ARROw = 2ND DERIVATIVE =  dv/dt)
    this.accelerationArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      1,
      0xFFFF00, // YELLOW
      0.2,
      0.15
    );
    this.scene.add(this.accelerationArrow);
    
    // MOUSE / TOUCH
    this.isDragging = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.setupEventListeners();
  }
  
  createBall() {
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF00FF, 
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0xFF00FF,
      emissiveIntensity: 0.2,
    });
    return new THREE.Mesh(geometry, material);
  }
  
  setupEventListeners() {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    canvas.addEventListener('mouseup', () => this.onPointerUp());
    canvas.addEventListener('touchstart', (e) => this.onPointerDown(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => this.onPointerMove(e.touches[0]));
    canvas.addEventListener('touchend', () => this.onPointerUp());
  }
  
  onPointerDown(event) {
    // CONVERT MOUSE / TOUCH TO NORMALIZED DEVICE COORDINATES
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // CHECK IF BALL CLICKED
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);
    
    if (intersects.length > 0) {
      this.isDragging = true;
      
      // LOCK THE CAMERA!
      this.controls.enabled = false;
      
      // CREATE A PLANE PERPENDICULAR TO CAMERA FOR DRAGGING 
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        this.mesh.position
      );
      
      this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset);  // OFFSET FROM BALL CENTER
      this.dragOffset.sub(this.mesh.position);
      
      this.previousPosition.copy(this.mesh.position); // STORE PREVIOUS POSITION FOR VELOCITY CALCULATION 
      
      this.velocity.set(0, 0, 0); // STOP ALL MOTION WHEN GRABBED
    }
  }
  
  onPointerMove(event) {
    if (!this.isDragging) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    //  UPDATE BALL POSITION BASED ON MOUSE
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
    
    this.previousPosition.copy(this.mesh.position);
    this.mesh.position.copy(intersectPoint.sub(this.dragOffset));
  }
  
  onPointerUp() {
    if (this.isDragging) {
      // CALCULATE THROW VELOCITY BASED ON LAST MOVEMENT 
      this.velocity.copy(this.mesh.position).sub(this.previousPosition);
      this.velocity.multiplyScalar(10); //  AMPLIFY FOR BETTER THROW FEEL
      
      // UNLOCK THE CAMERA!
      this.controls.enabled = true;
      
      this.isDragging = false;
    }
  }
  
  update(deltaTime) { // UPDATE VISUALS WHILE DRAGGING
    if (this.isDragging) {
      this.updateVisuals();
      return;
    }
    
    // ~*~*~*~*~ CALCULUS TIME! ~*~*~*~*~🎓
    
    // ACCELERATION = SECOND DERIVATIVE =  d²p/dt²
    this.acceleration.set(0, this.gravity, 0); // GRAVITY
    const dragForce = this.velocity.clone().multiplyScalar(-(1 - this.airResistance) * 10); // AIR RESISTANCE CREATES ACCELERATION OPPOSITE TO VELOCITY 
    this.acceleration.add(dragForce);
    
    this.velocity.y += this.gravity * deltaTime; //  GRAVITY TO VELOCITY - FIRST DERIVATIVE dp/dt 
    
    this.velocity.multiplyScalar(this.airResistance);  // AIR RESISTANCE
    
    this.mesh.position.add(  // UPDATE POSITION = INTEGRATION OF VELOCITY 
      this.velocity.clone().multiplyScalar(deltaTime)
    );
    
    if (this.mesh.position.y < this.radius) {  // GROUND COLLISION (XZ) (Y=0)
      this.mesh.position.y = this.radius;
      
      this.velocity.y *= -this.bounciness; // BOUNCE - VELOCITY REVERSES AND LOSES ENERGY 
      
      this.velocity.x *= this.friction; // FRICTION ON HORIZONTAL MOVEMENT (XZ)
      this.velocity.z *= this.friction;
      
      if (Math.abs(this.velocity.y) < 0.1) {  // STOP TINY BOUNCES
        this.velocity.y = 0;
      }
    }
    
    this.updateTrail();
    
    this.updateVisuals();   // UPDATE VISUAL INDICATORS
  }
  
  updateTrail() {
    if (!this.showTrail) return;
    
    this.trailPoints.push(this.mesh.position.clone());
   
    if (this.trailPoints.length > this.maxTrailPoints) {  // KEEP TRAIL LIMITED 
      this.trailPoints.shift();
    }
    
    const positions = new Float32Array(this.trailPoints.length * 3);  // LINE GEOMETRY
    this.trailPoints.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  
  updateVisuals() {  // BALL COLOR BASED ON SPEED
    const speed = this.velocity.length();
    const maxSpeed = 15;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    
    const color = new THREE.Color();
    if (normalizedSpeed < 0.5) {
      color.lerpColors(
        new THREE.Color(0x0000FF), // BLUE = SLOW
        new THREE.Color(0xFF00FF), // MAGENTA = MID)
        normalizedSpeed * 2
      );
    } else {
      color.lerpColors(
        new THREE.Color(0xFF00FF), // MAGENTA = MID
        new THREE.Color(0xFF0000), // RED = FAST
        (normalizedSpeed - 0.5) * 2
      );
    }
    
    this.mesh.material.color = color;
    this.mesh.material.emissive = color;
    this.mesh.material.emissiveIntensity = 0.2 + normalizedSpeed * 0.3;
    
    // VELOCITY UPDATE
    if (this.showVelocity && speed > 0.1) {
      const direction = this.velocity.clone().normalize();
      const length = Math.min(speed * 0.3, 3); //SCALE FOR VISIBILITY
      
      this.velocityArrow.position.copy(this.mesh.position);
      this.velocityArrow.setDirection(direction);
      this.velocityArrow.setLength(length, length * 0.2, length * 0.15);
      this.velocityArrow.visible = true;
    } else {
      this.velocityArrow.visible = false;
    }
    
    if (this.showAcceleration && this.acceleration.length() > 0.1) {  // UPDATE ACCELERATION ARROW 
      const direction = this.acceleration.clone().normalize();
      const length = Math.min(this.acceleration.length() * 0.1, 2);
      
      this.accelerationArrow.position.copy(this.mesh.position);
      this.accelerationArrow.setDirection(direction);
      this.accelerationArrow.setLength(length, length * 0.2, length * 0.15);
      this.accelerationArrow.visible = true;
    } else {
      this.accelerationArrow.visible = false;
    }
  }
  
  toggleTrail() {
    this.showTrail = !this.showTrail;
    this.trailLine.visible = this.showTrail;
  }
  
  toggleVelocity() {
    this.showVelocity = !this.showVelocity;
  }
  
  toggleAcceleration() {
    this.showAcceleration = !this.showAcceleration;
  }
  
  show() {
    this.mesh.visible = true;
  }
  
  hide() {
    this.mesh.visible = false;
    this.trailLine.visible = false;
    this.velocityArrow.visible = false;
    this.accelerationArrow.visible = false;
  }
  
  toggle() {
    this.mesh.visible = !this.mesh.visible;
    if (!this.mesh.visible) {
      this.trailLine.visible = false;
      this.velocityArrow.visible = false;
      this.accelerationArrow.visible = false;
    }
  }
  
  reset() {
    this.mesh.position.set(0, 3, 0);
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, this.gravity, 0);
    this.trailPoints = [];
    this.updateTrail();
  }
  
  setRadius(newRadius) {
    this.radius = newRadius;
    this.scene.remove(this.mesh); // REMOVE OLD MESH
    this.mesh = this.createBall(); // NEW MESH
    const currentPos = this.mesh.position.clone();  // RESTORE POSITION - ADJUST Y TO STAY ABOVE GROUND
    this.mesh.position.copy(currentPos);
    
    if (this.mesh.position.y < this.radius) { // KEEP BALL FROM CLIPPING THROUGH GROUND
      this.mesh.position.y = this.radius;
    }
    
    this.scene.add(this.mesh); // ADD BACK TO SCENE
  }
}