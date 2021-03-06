var gl;
var scene;
var xoff = 0, yoff = 0;
var mvMatrixStack = [];

var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;

var modelLoaded = false;
var modelTextureLoaded = false;
var modelTexture2Loaded = false;

var zoom = -6.5;

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl");
        console.log("w: " + canvas.width);
        console.log("h: " + canvas.height);
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(  Try Chrome?");
    }
}


 function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
    shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    shaderProgram.lightPosition = gl.getUniformLocation(shaderProgram, "lightPosition");
    shaderProgram.lightPositionUniform = gl.getUniformLocation(shaderProgram, "lightPosition");
}


var mvMatrix = mat4.create();
var pMatrix = mat4.create();

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    normalMatrix = customInvert43(mvMatrix);
    //mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, [0, 0.0, zoom]);


    if(modelLoaded){
        mvPushMatrix();
        mat4.rotate(mvMatrix, mvMatrix, xoff, [0.0, 1.0, 0.0]);
        mat4.rotate(mvMatrix, mvMatrix, yoff, [1.0, 0.0, 0.0]); 
        mat4.translate(mvMatrix, mvMatrix, [0, 0, 0.0]);
       

        
        //Bind Vertex Locations
        gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, modelVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //Bind Normals
        gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, modelVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //Bind Texture Face Coords
        gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexTextureBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, modelVertexTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);

        /*
        //Textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, modelTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, modelTexture2);
        gl.uniform1i(shaderProgram.samplerUniform2, 1);
        */

        //Lighting
        gl.uniform3f(
            shaderProgram.ambientColorUniform,
            0.2,
            0.2,
            0.2
        );

        var lightingDirection = [
            0.3,
            0.3,
            0.3
        ];
        var adjustedLD = vec3.create();
        vec3.normalize(adjustedLD, lightingDirection);
        //vec3.scale(adjustedLD, -1);
        gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

        gl.uniform3f(
            shaderProgram.directionalColorUniform,
            .8,
            .8,
            .8
        );

        gl.uniform3f(
            shaderProgram.lightPositionUniform,
            6.5,
            7.0,
            -3.0
        );
        
        //Bind Vertex Indicies and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelVertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, modelVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        mvPopMatrix();
    }
}
function customInvert43(matrix){
    var returnmat = mat3.create(); 
    mat3.fromMat4(returnmat, matrix);
    mat3.invert(returnmat, returnmat);
    return returnmat;
}

var overRenderer;

function webGLStart() {
    var canvas = document.getElementById("my-canvas");
    //canvas.width = $(window).width(); 
    //canvas.height = $(window).height()*.9; 
    initGL(canvas);
    initShaders();
    initScene();
    canvas.addEventListener('mousewheel', onMouseWheel, false);
    canvas.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);
    canvas.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);
    initMouseGestures();
    getModelFromFile(modelURL, canvas);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    tick();
}

function initMouseGestures() {
    var mousedown = false;
    var canvas = $('#my-canvas');
    var coord = {x:0, y:0};
    console.log(canvas);
    canvas.mousedown(function(event){
        console.log(event);
        mousedown = true;
        coord.x = event.offsetX;
        coord.y = event.offsetY;
    });
    canvas.mouseup(function(){
        mousedown = false;
    });
    canvas.mouseout(function(){
        mousedown = false;
    });
    canvas.mousemove(function(event){
        console.log(mousedown);
        if(mousedown){
            var xdiff = event.offsetX - coord.x;
            var ydiff = event.offsetY - coord.y;
            coord.y = event.offsetY;
            coord.x = event.offsetX;
            xoff += .01*xdiff;
            yoff += .01*ydiff;
            console.log("rotating");   
        }
    });
}

function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom += .005*event.wheelDeltaY;
    }
    return false;
}

function tick(){
    drawScene();
    requestAnimFrame(tick);
}

var modelVertexPositionBuffer;
var modelVertexTextureBuffer;
var modelVertexIndexBuffer;
var modelVertexNormalBuffer;
var normalAccumilator;
function finishedModelDownload(data){
    //debugger;

    var text= String(data);
    var lines = text.split(/\n/);
    normalAccumilator = new Array();
    scene.vertices = new Array();

    var vertex_pattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
    var normal_pattern = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
    var uv_pattern = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
    var face_pattern1 = /f( +\d+)( +\d+)( +\d+)( +\d+)?/;
    var face_pattern2 = /f( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))?/;
    var face_pattern3 = /f( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))?/;
    var face_pattern4 = /f( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))?/;

    for(var i =0; i < lines.length; i++){
        var line = lines[i];

        if(line.length === 0 || line[0] === '#'){
            continue;
        }
        else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {
            // ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
            scene.vertices.push(parseFloat( result[ 1 ] ));
            scene.vertices.push(parseFloat( result[ 2 ] ));
            scene.vertices.push(parseFloat( result[ 3 ] ));
            normalAccumilator.push(vec3.create());


        } else if ( ( result = normal_pattern.exec( line ) ) !== null ) {
            // ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
        } else if ( ( result = uv_pattern.exec( line ) ) !== null ) {
            // ["vt 0.1 0.2", "0.1", "0.2"]
        } else if ( ( result = face_pattern1.exec( line ) ) !== null ) {
            // just a mesh, no textures or normals
            // ["f 1 2 3", "1", "2", "3", undefined]
            if ( result[ 4 ] === undefined ) {
                tempFace = vec3.fromValues(parseInt( result[1] )-1,parseInt( result[2] )-1,parseInt( result[3] )-1);
                scene.faces.push(tempFace);        
            } else {
                tempFace = vec3.fromValues(parseInt( result[1] )-1,parseInt( result[2] )-1,parseInt( result[3] )-1);
                scene.faces.push(tempFace);
                tempFace = vec3.fromValues(parseInt( result[1] )-1,parseInt( result[3] )-1,parseInt( result[4] )-1);
                scene.faces.push(tempFace);
            }

        } else if ( ( result = face_pattern2.exec( line ) ) !== null ) {
            // ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]
            if ( result[ 10 ] === undefined ) {
                tempFace = vec3.fromValues(parseInt( result[2] )-1,parseInt( result[5] )-1,parseInt( result[8] )-1);
                scene.faces.push(tempFace);        
            } else {
                tempFace = vec3.fromValues(parseInt( result[2] )-1,parseInt( result[5] )-1,parseInt( result[8] )-1);
                scene.faces.push(tempFace);
                tempFace = vec3.fromValues(parseInt( result[1] )-1,parseInt( result[8] )-1,parseInt( result[11] )-1);
                scene.faces.push(tempFace);
            }

        } else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

            // ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

        } else if ( ( result = face_pattern4.exec( line ) ) !== null ) {
            // ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]
        } else if ( /^o /.test( line ) ) {            
            // object
        } else if ( /^g /.test( line ) ) {
            // group
        } else if ( /^usemtl /.test( line ) ) {
            // material
            //material.name = line.substring( 7 ).trim();
        } else if ( /^mtllib /.test( line ) ) {
            // mtl file
        } else if ( /^s /.test( line ) ) {
            // smooth shading
        } else {
           // console.log( "THREE.OBJLoader: Unhandled line " + line );
        }
    }
    console.log(scene.faces.length);
    for(var i = 0; i < scene.faces.length; i++){
        var currFace = scene.faces[i];
        var vec12 = vec3.fromValues(
            scene.vertices[currFace[1]*3]-scene.vertices[currFace[0]*3],
            scene.vertices[currFace[1]*3+1]-scene.vertices[currFace[0]*3+1],
            scene.vertices[currFace[1]*3+2]-scene.vertices[currFace[0]*3+2]);
        var vec23 = vec3.fromValues(
            scene.vertices[currFace[2]*3]-scene.vertices[currFace[1]*3],
            scene.vertices[currFace[2]*3+1]-scene.vertices[currFace[1]*3+1],
            scene.vertices[currFace[2]*3+2]-scene.vertices[currFace[1]*3+2]);
        var cross12_23 = vec3.create();
        vec3.cross(cross12_23, vec12, vec23);
       
        
        vec3.add(normalAccumilator[currFace[0]], normalAccumilator[currFace[0]], cross12_23);
        vec3.add(normalAccumilator[currFace[1]], normalAccumilator[currFace[1]], cross12_23);
        vec3.add(normalAccumilator[currFace[2]], normalAccumilator[currFace[2]], cross12_23);
    }
    for(var i = 0; i < normalAccumilator.length; i++){
        vec3.normalize(normalAccumilator[i],normalAccumilator[i]);
    }

    modelVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexNormalBuffer);
    var vertexNormals = [];
    for(var i = 0; i < normalAccumilator.length; i++){
        vertexNormals.push(normalAccumilator[i][0]);
        vertexNormals.push(normalAccumilator[i][1]);
        vertexNormals.push(normalAccumilator[i][2]);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
    modelVertexNormalBuffer.itemSize = 3;
    modelVertexNormalBuffer.numItems = normalAccumilator.length;


    modelVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexPositionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scene.vertices), gl.STATIC_DRAW);
    modelVertexPositionBuffer.itemSize = 3;
    modelVertexPositionBuffer.numItems = scene.vertices.length/3;


    modelVertexTextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexTextureBuffer);
    var textureCoords = [
      // Front face
      0.0, 0.9,
      0.1, 0.95,
      0.15, 1.0,
      0.2, 0.8,
      0.25, 0.85,
      0.3, 0.4,
      0.35, 0.5,
      0.4, 0.55,
      0.45, 0.33,
      0.5, 0.7,
      0.6, 0.45,
      0.65, 0.2,
      0.7, 0.75,
      0.75, 0.25,
      0.8, 0.1,
      0.85, 0.15,
      0.9, 0.05,
      0.95, 0.7,
      1.0, 0.67
    ];
    var texture = [];
    for(var i = 0; i < scene.vertices.length/3; i++){
        texture.push(textureCoords[i%textureCoords.length]);
        texture.push(textureCoords[i%textureCoords.length+1]);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texture), gl.STATIC_DRAW);
    modelVertexTextureBuffer.itemSize = 2;
    modelVertexTextureBuffer.numItems = scene.vertices.length/3;


    modelVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelVertexIndexBuffer);
    var modelVertexIndices = [];
    for (var i = 0; i < scene.faces.length; i++) {
        var face = scene.faces[i];
        modelVertexIndices.push(face[0]);
        modelVertexIndices.push(face[1]);
        modelVertexIndices.push(face[2]);
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelVertexIndices), gl.STATIC_DRAW);
    modelVertexIndexBuffer.itemSize = 1;
    modelVertexIndexBuffer.numItems = modelVertexIndices.length;


    modelLoaded = true;
    //drawScene();
}
function getModelFromFile(modelURL){
    var loader = $('#loaderbar').width(1);
    var canvas = $('#my-canvas');
    (function addXhrProgressEvent($) {
        var originalXhr = $.ajaxSettings.xhr;
        $.ajaxSetup({
            progress: function() { console.log("standard progress callback"); },
            xhr: function() {
                var req = originalXhr(), that = this;
                if (req) {
                    if (typeof req.addEventListener == "function") {
                        req.addEventListener("progress", function(evt) {
                            that.progress(evt);
                        },false);
                    }
                }
                return req;
            }
        });
    })($);
    $.ajax({
        url: modelURL,
        type: "GET",
        dataType: "text/html",
        success: function() { console.log("hello?")},
        complete: function(data) {
            $('#loaderbar').width(canvas.width()).animate({
                height: '0px',
                opacity: '0'
                }, 500);
            finishedModelDownload(data.responseText);

        },
        progress: function(evt) {
            if (evt.lengthComputable) {
                loader.width(canvas.width()*evt.loaded / evt.total );
            }
            else {
                console.log("Length not computable.");
            }
        }
     
    });
    //$.get(modelURL, finishedModelDownload, 'text')
}

function face(_v1, _v2, _v3){
    this.v1 = parseInt(_v1);
    this.v2 = parseInt(_v2);
    this.v3 = parseInt(_v3);

    function setNormal(normal) {
        this.normal = normal;
    }
}
function initScene(){
    scene = new Object();
    scene.vertices = new Array();
    scene.faces = new Array();
}
function mvPushMatrix() {
    var copy = mat4.create();
    copy = mat4.clone(mvMatrix);
    //mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}
function render(a){
    var x = document.getElementById("selection").options[document.getElementById("selection").selectedIndex].value;
    var canvas = document.getElementById("my-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    initScene();
    //initTexture();
    modelLoaded = false;
    getModelFromFile(filename);
}