let gl;

const cubePoints = [ // punktar notaðir til þess að búa til teninga
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];
// Úlfar
const WOLF_COLOR = vec4(0.5, 0.5, 0.5, 1);
const TIME_BETWEEN_MOVEMENT_WOLF = 800;
const TIME_BETWEEN_STARVATION = 150000;
let timeSinceLastMovementWolf = performance.now();
let nrOfWolfs = 1;

// Kindur
const SHEEP_COLOR = vec4(1, 1, 1, 1);
const TIME_BETWEEN_MOVEMENT_SHEEP = 1000;
let timeSinceLastMovementSheep = performance.now();
let nrOfSheeps = 1;

// Líkan
let numberOfBoxes = 10;
let speed = 1;

let mainGrid = grid(numberOfBoxes);

// Rammar
let wireframeData = generateWireFrame(numberOfBoxes, vec4(1, 0, 0, 1));
let wireFrameOn = false;
let frameData = generateFrameColor(vec4(0, 0, 1, 0));
spawnSheepsBeginning();
spawnWolfsBeginning();

//breytur fyrir hreyfingu líkansins
let modelRotY = 0;
let modelRotX = 0;
let modelMovementX = 0;
let modelMovementY = 0;
let modelRotStartX = 0;
let modelRotStartY = 0;
let modelRotating = false;
let modelMoving = false;
let modelZoom = 1.0;

//Matrix location
let matrixLoc;



window.onload = function init() {
    //Setja upp forritið.
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(canvas);

    if(!gl) { alert('WebGL isnt available'); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // Sleppa því að teikna bakhliðar
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);

    program = initShaders(gl, 'vertex-shader', 'fragment-shader');

    gl.useProgram(program);

    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wireframeData, gl.STATIC_DRAW);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(generateCube()), gl.STATIC_DRAW);


    let vPosition = gl.getAttribLocation(program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 8*4, 0);
    gl.enableVertexAttribArray(vPosition);

    let vColor = gl.getAttribLocation(program, 'vColor');
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 8*4, 4*4); // önnur hver heiltala í buffernum er litur. 
    gl.enableVertexAttribArray(vColor); 

    matrixLoc = gl.getUniformLocation(program, 'rotation');

    const perspectiveLoc = gl.getUniformLocation(program, 'perspective'); //Set perspective fylkið
    gl.uniformMatrix4fv(perspectiveLoc, false, flatten(perspective(65, 2, 0.2, 5)));

    window.addEventListener('keydown', function(e) {

        switch(e.keyCode) {

            case 38: // upp ör
                modelZoom += 0.05;
                break;

            case 40: // Niður ör
                modelZoom -= 0.05;
                break;

            case 65: // a
                mainGrid.addSheep(0,0,0);
                break;
            
            case 82: // r
                mainGrid.removeSheep(0);
                break;
        }
    });

    //Listeners fyrir músina.
    canvas.addEventListener('mousedown', function(e) {

        if(e.button == 0) { // vinstri músarsmellur
            modelRotStartX = e.offsetX;
            modelRotStartY = e.offsetY;
            modelRotating = true;
        } else if (e.button == 2) { //hægri músarsmellur
            modelMoveStartX = e.offsetX;
            modelMoveStartY = e.offsetY;
            modelMoving = true;
        }  
    });

    canvas.addEventListener('mouseup', function(e) {
        modelRotating = false;
        modelMoving = false;
    });

    canvas.addEventListener('mousemove', function(e) {
        if (modelRotating) {
            modelRotX = (modelRotX + (e.offsetX - modelRotStartX)) % 360;
            modelRotY = (modelRotY + (e.offsetY - modelRotStartY)) % 360;
            modelRotStartX = e.offsetX;
            modelRotStartY = e.offsetY;
        }

        if (modelMoving) {
            modelMovementX = (modelMovementX + (e.offsetX - modelMoveStartX) / 1000);
            modelMovementY = (modelMovementY + (modelMoveStartY - e.offsetY) / 1000);
            modelMoveStartX = e.offsetX;
            modelMoveStartY = e.offsetY;
        }
    });

    canvas.addEventListener('mousewheel', function(e) {
        if(e.wheelDelta > 0) {
            modelZoom += 0.05;
        } else {
            modelZoom -= 0.05;
        }
    });

    canvas.oncontextmenu = function(e) {
        e.preventDefault();
    }

    document.getElementById('number-of-boxes').addEventListener('change', function(e) {
        const value = parseInt(document.getElementById('number-of-boxes').value);

        document.getElementById('number-of-boxes-value').innerHTML = value;
        numberOfBoxes = value;
        wireframeData = generateWireFrame(value, vec4(1, 0, 0, 1));
        mainGrid = grid(value);

        spawnWolfsBeginning();
        spawnSheepsBeginning();
    });

    document.getElementById('wireframe-on').addEventListener('change', function(e) {
        wireFrameOn = !wireFrameOn;
    });

    document.getElementById('speed').addEventListener('change', function() {
        const value = parseInt(document.getElementById('speed').value);

        document.getElementById('speed-value').innerHTML = value + 'x';

        speed = value;
    });

    document.getElementById('nr-of-wolfs').addEventListener('change', function() {
        const value = parseInt(document.getElementById('nr-of-wolfs').value);

        document.getElementById('wolf-value').innerHTML = value;

        nrOfWolfs = value;
        wireFrameData = generateWireFrame(numberOfBoxes, vec4(1, 0, 0, 1));
        mainGrid = grid(numberOfBoxes);

        spawnWolfsBeginning();
        spawnSheepsBeginning();
    });

    document.getElementById('nr-of-sheep').addEventListener('change', function() {
        const value = parseInt(document.getElementById('nr-of-sheep').value);

        document.getElementById('sheep-value').innerHTML = value;

        nrOfSheeps = value;
        wireFrameData = generateWireFrame(numberOfBoxes, vec4(1, 0, 0, 1));
        mainGrid = grid(numberOfBoxes);

        spawnWolfsBeginning();
        spawnSheepsBeginning();
    });


    render();
}

function spawnWolfsBeginning() {
    for (let i = 0; i < nrOfWolfs; i++) {
        const x = Math.floor((Math.random()*numberOfBoxes));
        const y = Math.floor((Math.random()*numberOfBoxes));
        const z = Math.floor((Math.random()*numberOfBoxes));

        mainGrid.addWolf(x, y, z);
    }
}

function spawnSheepsBeginning() {
    for (let i = 0; i < nrOfSheeps; i++) {
        const x = Math.floor((Math.random()*numberOfBoxes));
        const y = Math.floor((Math.random()*numberOfBoxes));
        const z = Math.floor((Math.random()*numberOfBoxes));

        mainGrid.addSheep(x, y, z);
    }
}

function generateWireFrame(n, color) {

    const spaceBetween = 1 / (n);

    let vertices = [];

    let x = -0.5, y = -0.5, z = -0.5;

    // Byrja á að teikna línur samsíða x-ás 
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
            vertices.push(vec4(0.5, y + i*spaceBetween, z + j*spaceBetween, 1));
            vertices.push(color);
            vertices.push(vec4(-0.5, y + i*spaceBetween, z + j*spaceBetween, 1));
            vertices.push(color);
        }
    }

    // Teikna svo línur samsíða y-ás.
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
            vertices.push(vec4(x + i*spaceBetween, 0.5, z + j*spaceBetween, 1));
            vertices.push(color);
            vertices.push(vec4(x + i*spaceBetween, -0.5, z + j*spaceBetween, 1));
            vertices.push(color);
        }
    }

    // Teikna að lokum línur samsíða z-ás.
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
            vertices.push(vec4(x + i*spaceBetween, y + j*spaceBetween, 0.5, 1));
            vertices.push(color);
            vertices.push(vec4(x + i*spaceBetween, y + j*spaceBetween, -0.5, 1));
            vertices.push(color);
        }
    }
    
    return vertices;
}

function generateCube() {
    const indices = [
        0, 1, 2, 0, 2, 3, // Framhlið
        1, 5, 6, 1, 6, 2, // vinstri hlið
        6, 5, 4, 6, 4, 7, // Bakhliðin 
        4, 0, 7, 0, 3, 7, // Hægri hlið
        3, 6, 7, 3, 2, 6, // Neðri hlið
        0, 5, 1, 0, 4, 5 // Uppi
    ];

    const colors = [ //Litir 
        vec4(1, 0, 0, 1), // Framhlið
        vec4(0, 1, 0, 1), // Vinstri hlið
        vec4(0, 0, 1, 1), //Bakhliðin
        vec4(1, 0, 1, 1), //Hægri hliðin
        vec4(1, 1, 0, 1), //Neðri Hlið
        vec4(0, 1, 1, 1), //Uppi
    ];

    let buffer = [];

    for(let i = 0; i < indices.length; i++) {
        let colorIndex = Math.floor(i / 6); // Svona fást mismunandi litir á hverja hlið
        
        buffer.push(cubePoints[indices[i]]); // Fyrst hnútur
        buffer.push(colors[colorIndex]); // Svo litur
    }

    return buffer;
}

function generateFrameColor(color) {
    const indices = [
        0, 1,
        1, 2,
        2, 3,
        3, 0,
        4, 5,
        5, 6,
        6, 7,
        7, 4,
        0, 4,
        1, 5,
        2, 6,
        3, 7,
    ];

    let buffer = [];
    
    for (let i = 0; i < indices.length; i++) {
        buffer.push(cubePoints[indices[i]]);
        buffer.push(color);
    }

    return buffer;
}

function generateCubeColor(color) {
    const indices = [
        0, 1, 2, 0, 2, 3, // Framhlið
        1, 5, 6, 1, 6, 2, // vinstri hlið
        6, 5, 4, 6, 4, 7, // Bakhliðin 
        4, 0, 7, 0, 3, 7, // Hægri hlið
        3, 6, 7, 3, 2, 6, // Neðri hlið
        0, 5, 1, 0, 4, 5 // Uppi
    ];

    let buffer = [];

    for(let i = 0; i < indices.length; i++) {
        buffer.push(cubePoints[indices[i]]); // Fyrst hnútur
        buffer.push(color); // Svo litur
    }

    return buffer;
}

function halfCube() {
    const indices = [
        0, 1, 2, 0, 2, 3, //Framhlið
        1, 5, 6, 1, 6, 2, // hin hliðin
    ];

    let vertices = [];

    for(let i = 0; i < indices.length; i++) {
        vertices.push(cubePoints[indices[i]]);
        if (i < 6) {
            vertices.push(vec4(1.0, 0.0, 0.0, 1.0));
        } else {
           vertices.push(vec4(0.0, 1,0, 0.0, 1.0));
        }
    }

    return vertices;
}

function wolf(x, y, z) {
    const wolfObj = {
        vertices: generateCubeColor(WOLF_COLOR),
        x: 0,
        y: 0,
        z: 0,
        timeOfLastMeal: performance.now(),
        nrOfSheepsEaten: 0,
        moveUp: function() {
            this.y = this.y + 1;
            if (this.y > numberOfBoxes - 1) {
                this.y = 0;
            }
        },
        moveDown: function() {
            this.y = this.y - 1;
            if (this.y < 0) {
                this.y = numberOfBoxes - 1;
            }
        },
        moveLeft: function() {
            this.x = this.x - 1;
            if (this.x < 0) {
                this.x = numberOfBoxes - 1;
            }
        },
        moveRight: function() {
            this.x = this.x + 1;
            if (this.x > numberOfBoxes - 1) {
                this.x = numberOfBoxes - 1;
            }
        },
        moveForward: function() {
            this.z = this.z - 1
            if (this.z < 0) {
                this.z = numberOfBoxes - 1;
            }
        },
        moveBack: function() {
            this.z = this.z + 1;
            if (this.z > numberOfBoxes - 1) {
                this.z = 0;
            }
        },
        getTranslateMatrix: function() {
            const spaceBetween = 1/numberOfBoxes;

            const start = add(vec4(-0.5, -0.5, -0.5, 0), vec4(spaceBetween / 2, spaceBetween / 2, spaceBetween / 2, 0));

            const coordVec = mult(
                        mat4(
                            this.x, 0, 0, 0,
                            0, this.y, 0, 0,
                            0, 0, this.z, 0,
                            0, 0, 0, 1,
                            ), 
                            vec4(spaceBetween, spaceBetween,spaceBetween, 1)
                    );

            const totalTranslation =  add(start, coordVec);

            return mat4(
                1, 0, 0, totalTranslation[0],
                0, 1, 0, totalTranslation[1], 
                0, 0, 1, totalTranslation[2],
                0, 0, 0, 1
            );
        },
        getScaleMatrix: function () {
            const scale = 1/numberOfBoxes;
            return mat4(
                scale, 0, 0, 0,
                0, scale, 0, 0,
                0, 0, scale, 0,
                0, 0, 0, 1,
                );
        },

    };
    
    wolfObj.x = x;
    wolfObj.y = y;
    wolfObj.z = z;

    return wolfObj;
}

function sheep(x, y, z) {
    const sheepObj = {
        vertices: generateCubeColor(SHEEP_COLOR),
        timeOfLastSpawn: performance.now(),
        timeBetweenNextSpawn: (Math.random()*100000),
        x: 0,
        y: 0,
        z: 0,
        moveUp: function() {
            this.y = this.y + 1;
            if (this.y > numberOfBoxes - 1) {
                this.y = 0;
            }
        },
        moveDown: function() {
            this.y = this.y - 1;
            if (this.y < 0) {
                this.y = numberOfBoxes - 1;
            }
        },
        moveLeft: function() {
            this.x = this.x - 1;
            if (this.x < 0) {
                this.x = numberOfBoxes - 1;
            }
        },
        moveRight: function() {
            this.x = this.x + 1;
            if (this.x > numberOfBoxes - 1) {
                this.x = 0;
            }
        },
        moveForward: function() {
            this.z = this.z - 1
            if (this.z < 0) {
                this.z = numberOfBoxes - 1;
            }
        },
        moveBack: function() {
            this.z = this.z + 1;
            if (this.z > numberOfBoxes - 1) {
                this.z = 0;
            }
        },
        getTranslateMatrix: function() {
            const spaceBetween = 1/numberOfBoxes;

            const start = add(vec4(-0.5, -0.5, -0.5, 0), vec4(spaceBetween / 2, spaceBetween / 2, spaceBetween / 2, 0));

            const coordVec = mult(
                        mat4(
                            this.x, 0, 0, 0,
                            0, this.y, 0, 0,
                            0, 0, this.z, 0,
                            0, 0, 0, 1,
                            ), 
                            vec4(spaceBetween, spaceBetween,spaceBetween, 1)
                    );

            const totalTranslation =  add(start, coordVec);

            return mat4(
                1, 0, 0, totalTranslation[0],
                0, 1, 0, totalTranslation[1], 
                0, 0, 1, totalTranslation[2],
                0, 0, 0, 1
            );
        },
        getScaleMatrix: function () {
            const scale = 1/numberOfBoxes;
            return mat4(
                scale, 0, 0, 0,
                0, scale, 0, 0,
                0, 0, scale, 0,
                0, 0, 0, 1,
                );
        },
        resetTimeBetweenSpawns: function () {
            this.timeBetweenNextSpawn = (Math.random()*100000);
            this.timeOfLastSpawn = performance.now();
        }

    };

    sheepObj.x = x;
    sheepObj.y = y;
    sheepObj.z = z;
    
    return sheepObj;
}

function grid(n) {

    const gridObj = {
        wolfs: [],
        sheeps: [],
        grid: [],
        sheepEatenCounter: 0,
        movements: ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'moveForward', 'moveBack'],
        generateGrid: function() {
            for (let i = 0; i < n; i++) {
                let tempPlane = [];
                for (let j = 0; j < n; j++) {
                    let tempRow = [];
                    for (let k = 0; k < n; k++) {
                        tempRow.push(null);
                    }
                    tempPlane.push(tempRow);
                }
                this.grid.push(tempPlane);
            }
        },
        moveSheeps: function() {
            for (let i = 0; i < this.sheeps.length; i++) {
                let movementIndex = Math.floor((Math.random()*this.movements.length));
                
                // TODO: Hér þarf að muna að tékka hvort að það sé nokkuð annað dýr fyrir.
                let movement = this.movements[movementIndex];
                
                // Hér þarf að tékka hvort að úlfur sé í einhverju hólfi við hiliðina á.

                this.grid[this.sheeps[i].x][this.sheeps[i].y][this.sheeps[i].z] = null;
               
                if (movement == 'moveUp') {
                    this.grid[this.sheeps[i].x][(this.sheeps[i].y+1) % n][this.sheeps[i].z] = this.sheeps[i];
                    this.sheeps[i].y = (this.sheeps[i].y+1) % n;
                } else if (movement == 'moveDown'){
                    if (this.sheeps[i].y == 0) {
                        this.sheeps[i].y = n-1;
                    } else {
                        this.sheeps[i].y = this.sheeps[i].y-1;
                    }
                    this.grid[this.sheeps[i].x][this.sheeps[i].y][this.sheeps[i].z] = this.sheeps[i];
                } else if (movement == 'moveRight') {
                    this.grid[(this.sheeps[i].x + 1) % n][this.sheeps[i].y][this.sheeps[i].z] = this.sheeps[i];
                    this.sheeps[i].x = (this.sheeps[i].x + 1) % n;
                } else if (movement == 'moveLeft') {
                    if (this.sheeps[i].x == 0) {
                        this.sheeps[i].x = n-1;
                    } else {
                        this.sheeps[i].x = this.sheeps[i].x-1;
                    }
                    this.grid[this.sheeps[i].x][this.sheeps[i].y][this.sheeps[i].z] = this.sheeps[i];
                } else if (movement == 'moveForward') {
                    if (this.sheeps[i].z == 0) {
                        this.sheeps[i].z = n-1;
                    } else {
                        this.sheeps[i].z = this.sheeps[i].z-1;
                    }
                    this.grid[this.sheeps[i].x][this.sheeps[i].y][this.sheeps[i].z] = this.sheeps[i];
                } else if (movement == 'moveBack') {
                    this.grid[this.sheeps[i].x][this.sheeps[i].y][(this.sheeps[i].z + 1) % n] = this.sheeps[i];
                    this.sheeps[i].z = (this.sheeps[i].z + 1) % n;
                }

                // Kalla á rétta move fallið.
                this.sheeps[i][movement]();
            }
        },
        moveWolfs: function() {
            for (let i = 0; i < this.wolfs.length; i++) {
                let movementIndex = Math.floor((Math.random()*this.movements.length));
                                
                // Hér fer ég í gegnum allar kindurnar þangað til að ég finn einhverja kind 
                // Í sömu línu eða dálki.
                
                let wolfSmellsSheep = false;
                let smallestDistance = -1;
                let direction = 0;
                let axis = 'c';

                for (let j = 0; j < this.sheeps.length; j++) {
                    if (this.sheeps[j].x === this.wolfs[i].x && this.sheeps[j].y == this.wolfs[i].y) {
                        // Öll hnit nema z þau sömu.
                        let distance = 0;
                        let tempDirection = 0;
                        if (this.sheeps[j].z < this.wolfs[i].z) {
                            if (this.wolfs[i].z - this.sheeps[j].z < numberOfBoxes - this.wolfs[i].z + this.sheeps[j].z) {
                                distance = this.wolfs[i].z - this.sheeps[j].z;
                                tempDirection = -1;
                            } else {
                                distance = numberOfBoxes - this.wolfs[i].z + this.sheeps[j].z;
                                tempDirection = 1;
                            }
                        } else {
                            if (this.sheeps[j].z - this.wolfs[i].z < numberOfBoxes - this.sheeps[j].z + this.wolfs[i].z) {
                                distance = this.sheeps[j].z - this.wolfs[i].z;
                                tempDirection = 1;
                            } else {
                                distance = numberOfBoxes - this.sheeps[j].z + this.wolfs[i].z;
                                tempDirection = -1;
                            }
                        }

                        if (distance < smallestDistance || smallestDistance === -1) {
                            smallestDistance = distance;
                            direction = tempDirection;
                            axis = 'z';
                        }

                    } else if (this.sheeps[j].y == this.wolfs[i].y && this.sheeps[j].z == this.wolfs[i].z) {
                        // Öll hnit nema x hnit þau sömu.
                        let distance = 0;
                        let tempDirection = 0;
                        if (this.sheeps[j].x < this.wolfs[i].x) {
                            if (this.wolfs[i].x - this.sheeps[j].x < numberOfBoxes - this.wolfs[i].x + this.sheeps[j].x) {
                                distance = this.wolfs[i].x - this.sheeps[j].x;
                                tempDirection = -1;
                            } else {
                                distance = numberOfBoxes - this.wolfs[i].x + this.sheeps[j].x;
                                tempDirection = 1;
                            }
                        } else {
                            if (this.sheeps[j].x - this.wolfs[i].x < numberOfBoxes - this.sheeps[j].x + this.wolfs[i].x) {
                                distance = this.sheeps[j].x - this.wolfs[i].x;
                                tempDirection = 1;
                            } else {
                                distance = numberOfBoxes - this.sheeps[j].x + this.wolfs[i].x;
                                tempDirection = -1;
                            }
                        }

                        if (distance < smallestDistance || smallestDistance === -1) {
                            smallestDistance = distance;
                            direction = tempDirection;
                            axis = 'x';
                        }
                    } else if (this.sheeps[j].z == this.wolfs[i].z && this.sheeps[j].x == this.wolfs[i].x) {
                        // Öll hnit nema y hnit þau sömu.
                        let distance = 0;
                        let tempDirection = 0;
                        if (this.sheeps[j].y < this.wolfs[i].y) {
                            if (this.wolfs[i].y - this.sheeps[j].y < numberOfBoxes - this.wolfs[i].y + this.sheeps[j].y) {
                                distance = this.wolfs[i].y - this.sheeps[j].y;
                                tempDirection = -1;
                            } else {
                                distance = numberOfBoxes - this.wolfs[i].y + this.sheeps[j].y;
                                tempDirection = 1;
                            }
                        } else {
                            if (this.sheeps[j].y - this.wolfs[i].y < numberOfBoxes - this.sheeps[j].y + this.wolfs[i].y) {
                                distance = this.sheeps[j].y - this.wolfs[i].y;
                                tempDirection = 1;
                            } else {
                                distance = numberOfBoxes - this.sheeps[j].y + this.wolfs[i].y;
                                tempDirection = -1;
                            }
                        }

                        if (distance < smallestDistance || smallestDistance === -1) {
                            smallestDistance = distance;
                            direction = tempDirection;
                            axis = 'y';
                        }
                    }
                }

                let movement = this.movements[movementIndex];
            
                // Færi í áttina að næstu kind ef hún er í beinni línu við úlfinn.
                if (smallestDistance !== -1) {
                    if (axis == 'x') {
                        if (direction > 0) {
                            movement = 'moveRight';
                        } else {
                            movement = 'moveLeft';
                        }
                    } else if (axis == 'y') {
                        if (direction > 0) {
                            movement = 'moveUp';
                        } else {    
                            movement = 'moveDown';
                        }
                    } else if (axis == 'z') {
                        if (direction > 0) {
                            movement = 'moveBack';
                        } else {
                            movement = 'moveForward';
                        }
                    }
                }

                this.grid[this.wolfs[i].x][this.wolfs[i].y][this.wolfs[i].z] = null;
                
                if (movement == 'moveUp') {
                    this.grid[this.wolfs[i].x][(this.wolfs[i].y+1) % n][this.wolfs[i].z] = this.wolfs[i];
                } else if (movement == 'moveDown'){
                    if (this.wolfs[i].y == 0) {
                        this.wolfs[i].y = n-1;
                    }
                    this.grid[this.wolfs[i].x][this.wolfs[i].y-1][this.wolfs[i].z] = this.wolfs[i];
                } else if (movement == 'moveRight') {
                    this.grid[(this.wolfs[i].x + 1) % n][this.wolfs[i].y][this.wolfs[i].z] = this.wolfs[i];
                } else if (movement == 'moveLeft') {
                    if (this.wolfs[i].x == 0) {
                        this.wolfs[i].x = n-1;
                    }
                    this.grid[this.wolfs[i].x - 1][this.wolfs[i].y][this.wolfs[i].z] = this.wolfs[i];
                } else if (movement == 'moveForward') {
                    if (this.wolfs[i].z == 0) {
                        this.wolfs[i].z = n-1;
                    }
                    this.grid[this.wolfs[i].x][this.wolfs[i].y][this.wolfs[i].z - 1] = this.wolfs[i];
                } else if (movement == 'moveBack') {
                    this.grid[this.wolfs[i].x][this.wolfs[i].y][(this.wolfs[i].z + 1) % n] = this.wolfs[i];
                }

                // Kalla á rétta move fallið.
                this.wolfs[i][movement]();
            }
        },
        sheepVertices: function() {
            let vertices = [];
            for (let i = 0; i < this.sheeps.length; i++) {
                for(let j = 0; j < this.sheeps[i].vertices.length; j++) {
                    vertices.append(this.sheeps[i].vertices[j]);
                }
            }

            return vertices;
        },
        spawnSheep: function(parentSheepIndex) {
            if (parentSheepIndex > this.sheeps.length-1) {
                throw new Error('Villa við að spawna kind');
            }

            const parentSheep = this.sheeps[parentSheepIndex];

            // Finna auðan reit nálægt kindinni.
            const {i, j, k} = this.findEmptySpace(parentSheep.x, parentSheep.y, parentSheep.z);
            if(i === null) {
                // Spawna ekki ef það er ekki neinn laus reitur.
                return;
            }
            
            this.addSheep(i, j, k);
        },
        addSheep: function(x, y, z) {
            const newSheep = sheep(x, y, z);
            this.sheeps.push(newSheep);

            this.grid[x][y][z] = newSheep; 
        },
        removeSheep: function(index) {
            const sheepToRemove = this.sheeps[index];
            
            this.grid[sheepToRemove.x][sheepToRemove.y][sheepToRemove.z] = null;
            
            this.sheeps.splice(index, 1);
        },
        removeWolf: function(index) {
            const wolfToRemove = this.wolfs[index];

            this.grid[wolfToRemove.x][wolfToRemove.y][wolfToRemove.z] = null;

            this.wolfs.splice(index, 1);
        },
        spawnWolf: function(parentWolfIndex) {
            if (parentWolfIndex > this.wolfs.length-1) {
                throw new Error('Villa við að spawna úlf');
            }

            const parentWolf = this.wolfs[parentWolfIndex];

            // Finna auðan reit nálægt kindinni.
            const {i, j, k} = this.findEmptySpace(parentWolf.x, parentWolf.y, parentWolf.z);
            if(i === null) {
                // Spawna ekki ef það er ekki neinn laus reitur.
                return;
            }
            
            this.addWolf(i, j, k);
        },
        addWolf: function(x, y, z) {
            const newWolf = wolf(x, y, z);
            this.wolfs.push(newWolf);

            this.grid[x][y][z] = newWolf;
        },
        findEmptySpace: function(x, y, z) {

            if (this.grid[(x + 1) % n][y][z] === null) {
                return { i: (x + 1) % n, j: y, k: z };
            } else if (this.grid[x][(y + 1) % n][z] === null) {
                return { i: x, j: (y + 1) % n, k: z };
            } else if (this.grid[x][y][(z + 1) % n] === null){
                return { i: x, j: y, k: (z + 1) % n };
            } else if (this.grid[(x - 1 + n) % n][y][z]) {
                return { i: (x - 1 + n) % n, j: y, k: z };
            } else if (this.grid[x][(y - 1 + n) % n][z] === null) {
                return { i: x, j: (y - 1 + n) % n, k: z };
            } else if (this.grid[x][y][(z - 1 + n) % n] === null) {
                return { i: x, j: y, k: (z - 1 + n) % n };
            }
            
            return { i: null, j: null, k: null };
        },
        drawSheeps: function(viewMatrix) {
            
            for (let i = 0; i < this.sheeps.length; i++) {
                temp = mult(viewMatrix, this.sheeps[i].getTranslateMatrix());
                temp = mult(temp, this.sheeps[i].getScaleMatrix());
                gl.uniformMatrix4fv(matrixLoc, false, flatten(temp));
                if(i < 1) { // Sendi gögnin bara einu sinni yfir fyrir allar kindurna.
                    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.sheeps[i].vertices), gl.STATIC_DRAW);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 36*2);
            }
        },
        drawWolfs: function (viewMatrix) {
            
            for (let i = 0; i < this.wolfs.length; i++) {
                temp = mult(viewMatrix, this.wolfs[i].getTranslateMatrix());
                temp = mult(temp, this.wolfs[i].getScaleMatrix());
                gl.uniformMatrix4fv(matrixLoc, false, flatten(temp));
                if(i < 1) { // Sendi gögnin bara einu sinni yfir fyrir allar kindurna.
                    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.wolfs[i].vertices), gl.STATIC_DRAW);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 36*2);
            }
        },
        checkForCollisions: function() {
            for(let j = 0; j < this.wolfs.length; j++) {
                for(let i = 0; i < this.sheeps.length; i++) {
                    let tempSheep = this.sheeps[i];
                    let tempWolf = this.wolfs[j];

                    if (tempSheep == null || tempWolf == null) {
                        continue;
                    }


                    if (tempSheep.x === tempWolf.x 
                        && tempSheep.y === tempWolf.y
                        && tempSheep.z === tempWolf.z) {
                            this.grid[tempWolf.x][tempWolf.y][tempWolf.z] = tempWolf;
                        
                            this.sheepEatenCounter = this.sheepEatenCounter + 1;
                            tempWolf.nrOfSheepsEaten = tempWolf.nrOfSheepsEaten + 1;
                            tempWolf.timeOfLastMeal = performance.now();
                            document.getElementById('sheeps-eaten').innerHTML = 'Kindur étnar: ' + this.sheepEatenCounter;
                            this.sheeps.splice(i, 1);
                            i = i - 1;
                            
                            if (tempWolf.nrOfSheepsEaten > 5) {
                                tempWolf.nrOfSheepsEaten = 0;
                                this.spawnWolf(j);
                            }
                    }
                    
                }
            }

        },
        checkForSpawns: function() {
            for(let i = 0; i < this.sheeps.length; i++) {
                let tempSheep = this.sheeps[i];
                if(this.sheeps.length < 0.9*numberOfBoxes**3) {
                    if (performance.now() - tempSheep.timeOfLastSpawn > (tempSheep.timeBetweenNextSpawn/speed))  {
                        this.spawnSheep(i);
                        tempSheep.resetTimeBetweenSpawns();
                    }
                }    
            }
        },
        checkForStarvingWolfs() {
            for (let i = 0; i < this.wolfs.length; i++) {
                let tempWolf = this.wolfs[i];
                if (performance.now() - tempWolf.timeOfLastMeal > (TIME_BETWEEN_STARVATION / speed)) {
                    this.removeWolf(i);
                }
            }
        }
    };

    gridObj.generateGrid();

    return gridObj;
}

function render() {

    mv = translate(0, 0, -2);
    mv = mult(mv, translate(modelMovementX, modelMovementY, 0));
    mv = mult(mv, rotateX(modelRotY));
    mv = mult(mv, rotateY(modelRotX));
    mv = mult(mv, scalem(modelZoom, modelZoom, modelZoom))

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv));
    
    
    // Teikna rammann.
    gl.bufferData(gl.ARRAY_BUFFER, flatten(frameData), gl.STATIC_DRAW);
    gl.drawArrays(gl.LINES, 0, frameData.length/2);
    
    // Teikna wireframe ef það á við.
    if (wireFrameOn) {
        gl.bufferData(gl.ARRAY_BUFFER, flatten(wireframeData), gl.STATIC_DRAW);
        
        gl.drawArrays(gl.LINES, 0, wireframeData.length/2);
    }
    
    mainGrid.checkForStarvingWolfs();

    if (performance.now() - timeSinceLastMovementSheep > (TIME_BETWEEN_MOVEMENT_SHEEP * (1/speed))) {
        timeSinceLastMovementSheep = performance.now();
        mainGrid.moveSheeps();
        mainGrid.checkForCollisions();
    }

    
    if (performance.now() - timeSinceLastMovementWolf > (TIME_BETWEEN_MOVEMENT_WOLF * (1/speed))) {
        timeSinceLastMovementWolf = performance.now();
        mainGrid.moveWolfs();
        mainGrid.checkForCollisions();
    }

    
    // Athuga hvort tími sé kominn á að kind fæði nýja kind.
    mainGrid.checkForSpawns();


    // Teikna kindur og úlfa.
    mainGrid.drawSheeps(mv);
    mainGrid.drawWolfs(mv);

    window.requestAnimationFrame(render);
}