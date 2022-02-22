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

    program = initShaders(gl, 'vertex-shader', 'fragment-shader');

    gl.useProgram(program);

    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(generateCube()), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 8*4, 0);
    gl.enableVertexAttribArray(vPosition);

    let vColor = gl.getAttribLocation(program, 'vColor');
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 8*4, 4*4); // önnur hver heiltala í buffernum er litur. 
    gl.enableVertexAttribArray(vColor); 

    matrixLoc = gl.getUniformLocation(program, 'rotation');

    const perspectiveLoc = gl.getUniformLocation(program, 'perspective'); //Set perspective fylkið
    gl.uniformMatrix4fv(perspectiveLoc, false, flatten(perspective(65, 2, 1, 5)));

    window.addEventListener('keydown', function(e) {

        switch(e.keyCode) {

            case 38: // upp ör
                modelZoom += 0.05;
                break;

            case 40: // Niður ör
                modelZoom -= 0.05;
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
            modelRotX = (modelRotX + (modelRotStartX - e.offsetX)) % 360;
            modelRotY = (modelRotY + (e.offsetY - modelRotStartY)) % 360;
            modelRotStartX = e.offsetX;
            modelRotStartY = e.offsetY;
        }

        if (modelMoving) {
            modelMovementX = (modelMovementX + (modelMoveStartX - e.offsetX) / 1000);
            modelMovementY = (modelMovementY + (modelMoveStartY - e.offsetY) / 1000);
            modelMoveStartX = e.offsetX;
            modelMoveStartY = e.offsetY;
        }
    });

    canvas.oncontextmenu = function(e) {
        e.preventDefault();
    }

    render();
}

function generateCube() {
    const indices = [
        0, 1, 2, 0, 2, 3, // Framhlið
        1, 5, 6, 1, 6, 2, // vinstri hlið
        6, 5, 4, 6, 4, 7, // Bakhliðin 
        4, 0, 7, 0, 3, 7, // Hægri hlið
        3, 6, 7, 3, 2, 6, // Neðri hlið
        0, 1, 5, 0, 5, 4 // Uppi
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

    console.log(vertices);

    return vertices;
}

function render() {

    mv = translate(0, 0, -2);
    mv = mult(mv, translate(modelMovementX, modelMovementY, 0));
    mv = mult(mv, rotateX(modelRotY));
    mv = mult(mv, rotateY(modelRotX));
    mv = mult(mv, scalem(modelZoom, modelZoom, modelZoom))

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv));

    gl.drawArrays(gl.TRIANGLES, 0, 36*2);

    window.requestAnimationFrame(render);
}