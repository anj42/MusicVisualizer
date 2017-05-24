
var visualizer, sphere, objParent;
var waves = [];
var orbs = [];

$(document).ready(function () {
    visualizer = new AudioVisualizer();
    visualizer.initialize();
    visualizer.createBars();
    visualizer.createText();
    visualizer.setupAudioProcessing();
    //visualizer.getAudio();
    visualizer.handleDrop();  
});



function AudioVisualizer(){

	this.numberOfBars = 60;

	this.scene;
	this.camera;
	this.renderer;
	this.controls;

	this.bars = new Array();

	this.javascriptNode;
	this.audioContext;
	this.sourceBuffer;
	this.analyser;
}

/*
	Text for the user
*/

AudioVisualizer.prototype.createText = function(){

	var text2 = document.createElement('div');
	text2.id = 'text2';
	text2.style.position = 'absolute';
	text2.style.width = 100;
	text2.style.height = 100;
	//text2.style.backgroundColor = "blue";
	text2.innerHTML = "drop an mp3 file to begin";
	text2.style.top = 25 + 'px';
	text2.style.left = 25 + 'px';
	document.body.appendChild(text2);
	
}


/*
	Object holding all the functions etc
*/
AudioVisualizer.prototype.initialize = function(){
	// scene and renderer
	this.scene = new THREE.Scene();
	var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

	this.renderer = new THREE.WebGLRenderer({antialias: false, alpha: true});
	this.renderer.setSize(WIDTH, HEIGHT);
	document.body.appendChild(this.renderer.domElement);

	//camera
	this.camera = new THREE.PerspectiveCamera(40, WIDTH/HEIGHT, 0.1, 20000);
	this.camera.position.set(0, 50, 375);
	this.scene.add(this.camera);

	this.camera.lookAt(new THREE.Vector3(0, 0, 0));

	var that = this;

	// handle screen resize
	window.addEventListener('resize', function(){
		var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

		that.renderer.setSize(WIDTH, HEIGHT);

		that.camera.aspect = WIDTH/HEIGHT;
		that.camera.updateProjectionMatrix();
	});

	// background color
	//this.renderer.setClearColor(0x333F47, 1);

	// create lights 
	var light = new THREE.PointLight(0xffffff, 0.5);
	light.position.set(100, 75, 50);
	this.scene.add(light);

	var light2 = new THREE.PointLight(0xffffff, 0.2);
	light2.position.set(-100, -75, -50);
	this.scene.add(light2);

	var ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
	this.scene.add(ambientLight);

	this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
};


// create the bars for music visualization
AudioVisualizer.prototype.createBars = function(){

	// add the main shape
	this.mesh = new THREE.Object3D();

	var geometry = new THREE.SphereGeometry(40, 12, 12);
	var sphereMat = new THREE.MeshPhongMaterial({
		color: new THREE.Color('#58585B'),
		specular: new THREE.Color('#58585B'),
		shading: THREE.FlatShading,
		wireframe: false
	});

	geometry.mergeVertices();
	var l = geometry.vertices.length;

	for (var i = 0; i < l; i++){
		var v = geometry.vertices[i];
		waves.push({
			y : v.y,
			x : v.x,
			z : v.z, 
			ang : Math.random() * Math.PI * 2,
			amp : 3 + Math.random() * 2,
			speed : 0.016 + Math.random() * 0.032
		});
	}


	this.sphere = new THREE.Mesh(geometry, sphereMat);
	this.mesh.add(this.sphere);
	this.scene.add(this.mesh);


	// add orbiting orbs
	this.objParent = new THREE.Object3D();

	// mesh for the orb
	var orbGeo = new THREE.SphereGeometry(2, 12, 12);
	var orbMat = new THREE.MeshPhongMaterial({
		color: new THREE.Color('#58585B'),
		specular: new THREE.Color('#58585B'),
		shading: THREE.FlatShading,
		wireframe: false
	});

	var counter = 0;

	for(var i = 0; i < 360; i += 7){

		var pivot = new THREE.Object3D();
		pivot.rotation.z = counter * Math.PI/52;
		counter += 2;
		this.objParent.add(pivot);

		var mesh = new THREE.Mesh( orbGeo, orbMat );
		orbs.push(mesh);

		//mesh.position.y = 85;
		mesh.scale.x = 0.2;
		mesh.scale.z = 0.2;

		pivot.add(mesh);

	}
		this.objParent.rotation.set(0, 0, -90 * (3.13/180));
		this.mesh.add(this.objParent);
};

/*
	Read the sound file
*/

AudioVisualizer.prototype.handleDrop = function(){
	//drag Enter
    document.body.addEventListener("dragenter", function () {
       
    }, false);

    //drag over
    document.body.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    //drag leave
    document.body.addEventListener("dragleave", function () {
       
    }, false);

	// drop
	document.body.addEventListener("drop", function(e){
		e.stopPropagation();
		e.preventDefault();

		//get the file
		var file = e.dataTransfer.files[0];
		var fileName = file.name;

		$("#guide").text("> " + fileName);

		var fileReader = new FileReader();

		fileReader.onload= function(e){
			var fileResult = e.target.result;
			visualizer.start(fileResult);
		};

		fileReader.onerror = function(e){
			debugger
		};

		fileReader.readAsArrayBuffer(file);
	}, false);
}

/*
	Buffers and nodes for managing audio
*/

AudioVisualizer.prototype.setupAudioProcessing = function(){
	// audio context
	this.audioContext = new AudioContext();

	// javascript node
	this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
	this.javascriptNode.connect(this.audioContext.destination);

	// create the source buffer
	this.sourceBuffer = this.audioContext.createBufferSource();

	// analyser node
	this.analyser = this.audioContext.createAnalyser();
	this.analyser.smoothingTimeConstant = 0.3;
	this.analyser.fftSize = 1024;//512;

	// connect source to analyzer
	this.sourceBuffer.connect(this.analyser);

	// analyser to speakers
	this.analyser.connect(this.javascriptNode);

	// source to analyser
	this.sourceBuffer.connect(this.audioContext.destination);

	var that = this;

	// bar animation
	this.javascriptNode.onaudioprocess = function(){


		var array = new Uint8Array(that.analyser.frequencyBinCount);
		that.analyser.getByteFrequencyData(array);

		// render the scene and update controls
		visualizer.renderer.render(visualizer.scene, visualizer.camera);
		visualizer.sphere.rotation.y += 0.0015;
		visualizer.objParent.rotation.z += 0.0015;

		var step = Math.round(array.length / 160); // / visualizer.numberOfBars);


		// modify the sphere
		var verts = visualizer.sphere.geometry.vertices;
		var l = verts.length;

		for (var i = 0; i < l; i++){
			var v = verts[i];
			var vprops = waves[i];
			var value = array[i * step] / 18 * Math.cos(vprops.ang) * Math.sin(vprops.ang);
			
			v.x = vprops.x + value * vprops.amp/2;//Math.cos(vprops.ang) * vprops.amp + value;
			v.y = vprops.y + value * vprops.amp/2;//Math.sin(vprops.ang) * vprops.amp + value;
			v.z = vprops.z + value ;//* vprops.amp;

			visualizer.sphere.geometry.scale.z = value;

			// increment angle for next frame
			vprops.ang += vprops.speed;
		}
		visualizer.sphere.geometry.verticesNeedUpdate = true;

		
		// iterate through the orbs and make them move
		for (var i = 0; i < orbs.length; i++){
			var value = array[i * step] / 2;
			//value = value < 1 ? 1 : value;
			orbs[i].scale.y = value/12;
			orbs[i].position.y = 85; 
			orbs[i].position.y += value/12;
		}
	}
};


/*
	start the audio processing
*/

AudioVisualizer.prototype.start = function(buffer){
	this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
	var that = this;

	function decodeAudioDataSuccess(decodedBuffer){
		that.sourceBuffer.buffer = decodedBuffer;
		that.sourceBuffer.start(0);
	}

	function decodeAudioDataFailed(){
		debugger
	}
};


/*
	Random color for the bars
*/

AudioVisualizer.prototype.getRandomColor = function(){

	var letters = '0123456789ABDCDEF'.split('');
	var color = '#';

	for (var i = 0; i < 6; i++){
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
};

