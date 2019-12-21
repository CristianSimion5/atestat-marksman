var canvas = document.getElementById("joc");
var ctx = canvas.getContext('2d');

//setarea dimensiunilor canvas-ului
canvas.width = window.innerWidth * 0.7;
canvas.height = window.innerHeight * 0.7;

//declararea variabilelor si constantelor
var v0 = 0, alfa = 0;
var framesPerSecond = 60, gameStart = false, gameOver = false, gameTime = 60;
var mouseInitX, mouseInitY, mouseFinX, mouseFinY, mousePressed = false;
var arrowInAir = false, passedMiddle, power, score = 0;
var currentTime, prevY, currentY, currentX, nextX;
var targetX = canvas.width * 0.9, targetY = canvas.height * 0.5, targetWidth = 20, targetHeight = 80, targetSpeed = 1000 / framesPerSecond * 0.15;
var toDrawX, toDrawY;
var arrowsStuckTarget = [], arrowsStuckFloor = [];
const pozArcX = 50, pozArcY = canvas.height * 0.85, podeaY = canvas.height * 0.9;
const g = 9.80665, distMax = 150, vmax = 250;

//Declararea si salvarea imaginilor in variabile
var arrow = new Image();	
arrow.src = "tiles/arrow.png";
var sprite = [];
for(var j = 0; j < 12; j++) {
	sprite[j] = new Image();
	var cifraZecilor =  Math.floor(j / 10);
	var cifraUnitatilor = j % 10;
	sprite[j].src = "tiles/tile0" + cifraZecilor + cifraUnitatilor + ".png";
}

//La incarcarea completa a ferestrei se initializeaza fundalul de inceput jocului
window.onload = function() {
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);		//deseneaza fundalul de inceput al jocului
	ctx.fillStyle = 'white';
	ctx.textAlign = "center";
	ctx.font = "70px Georgia";
	ctx.fillText("Marksman", canvas.width * 0.5, canvas.height * 0.4);
	ctx.beginPath();
	ctx.rect(canvas.width * 0.5 - 150, canvas.height * 0.5 + 160 - 50, 300, 100);
	ctx.fill();
	ctx.fillStyle = 'black';
	ctx.font = "42px Georgia";
	ctx.fillText("Începe jocul!", canvas.width * 0.5, canvas.height * 0.5 + 170);
}

//calculeaza coordonata x a aruncarii sub un unghi
function coord_x(t) {
	return v0 * t * Math.cos(alfa);
}

//calculeaza coordonata y a aruncarii sub un unghi
function coord_y(t) {
	return v0 * t * Math.sin(alfa) - g / 2 * t * t;
}

//calculeaza distanta euclidiana dintre 2 puncte A(x1,y1) si B(x2,y2)
function euclidianDistance(x1, y1, x2, y2) {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

//calculeaza si returneaza coordonatele x si y ale cursor-ului mouse-ului
function calculateMousePos(evt) {
	var rect = canvas.getBoundingClientRect();
	var root = document.documentElement;
	var mouseX = evt.clientX - rect.left - root.scrollLeft;
	var mouseY = evt.clientY - rect.top - root.scrollTop;
	return	{
		x: mouseX,
		y: mouseY
	};
}

//functia reseteaza jocul, reinitializand toate variabilele ce influenteaza o runda
//si stergand sagetile ramase din runda precedenta
//dupa ce jocul este resetat, acesta iese din modul "Game over"
//pentru ca apasarea pe butonul de restart sa inceapa o runda noua
function resetGame() {
	gameTime = 60;
	score = 0;
	alfa = 0;
	arrowsStuckTarget.length = 0;
	arrowsStuckFloor.length = 0;
	targetX = canvas.width * 0.9;
	targetY = canvas.height * 0.5;
	targetSpeed = 1000 / framesPerSecond * 0.15;
	arrowInAir = false;
	mousePressed = false;
	gameOver = false;
}

//adauga o functie ce actioneaza atunci cand pe canvas este apasat click
canvas.addEventListener('mousedown', 
function(evt) {
	if(!gameStart && ctx.isPointInPath(mouseFinX, mouseFinY)) {	//cand este apasat click iar jocul nu a inceput inca, desenarea cadrelor incepe
		gameStart = true;
		setInterval(draw, 1000 / framesPerSecond);		
	}
	else if(gameOver && ctx.isPointInPath(mouseFinX, mouseFinY)) {		//daca runda s-a terminat si este apasat click pe ultima figura desenata (in acest caz este elipsa pe care scrie "Joacă din nou!"), jocul este resetat pentru a incepe o runda noua
		resetGame();
	}
	else if(!arrowInAir && gameStart) {		//daca o sageata nu este in aer, apasarea click-ului va seta un punct de plecare pentru segmentul trasat ulterior
		var mousePos = calculateMousePos(evt);
		mouseInitX = mousePos.x;
		mouseInitY = mousePos.y;
		mousePressed = true;
	}
});

//adauga o functie ce actioneaza atunci cand pe canvas este dat drumul click-ului
canvas.addEventListener('mouseup', 
function() { 
	if(!arrowInAir && mousePressed && !gameOver) {		//daca o sageata nu este in aer, mouse-ul a fost apasat anterior in interiorul canvas-ului si jocul nu s-a terminat inca, o sageata este lansata
		mousePressed = false; 
		arrowInAir = true; 
		passedMiddle = false;
		currentTime = 4 / framesPerSecond;				//timpul initial al unei sageti este mai mare decat 0 pentru ca animatia sagetii trasa din arc sa fie fluida
		prevY = 0;
		nextX = coord_x(currentTime);
	}
});		

//adauga o functie ce actioneaza atunci cand pe canvas este miscat mouse-ul, care salveaza pozitia curenta a cursor-ului pentru trasarea segmentului
canvas.addEventListener('mousemove', 
function(evt) {
	var mousePos = calculateMousePos(evt);
	mouseFinX = mousePos.x;	
	mouseFinY = mousePos.y;
});

//functia detecteaza coliziunea unei sageti cu tinta, si salveaza pozitia relativa si unghiul la care sageata se infinge in tinta
function collisionDetection(time) {
	for(var Y = time; Y <= currentTime ; Y += 0.0001)
		if(pozArcY - coord_y(Y) > targetY && pozArcY - coord_y(Y) < targetY + targetHeight && pozArcX + coord_x(Y) >= targetX) {	
			var v2 = Math.sqrt(v0 * v0 + g * g * Y * Y - 2 * v0 * g * Y * Math.sin(alfa));
			var beta = Math.acos(v0 / v2 * Math.cos(alfa));
			if(!passedMiddle){
				score++;
				arrowsStuckTarget.push({x: pozArcX + coord_x(Y), y: pozArcY - coord_y(Y) - targetY, angle: -beta});
			}
			else {
				score += 2;
				arrowsStuckTarget.push({x: pozArcX + coord_x(Y), y: pozArcY - coord_y(Y) - targetY, angle: beta});
			}
			return true;
		}
	return false;
}

//functia deseneaza scorul si timpul ramas, scazand in acelasi timp o fractiune dintr-o secunda in functie de cadrele pe secunda
function drawScoreAndTimeLeft() {
	ctx.fillStyle = "white";
	ctx.font = "30px Georgia";
	ctx.textAlign = "start";
	ctx.fillText("Scor: " + score, 20, 40);
	ctx.fillStyle = "white";
	ctx.font = "30px Georgia";
	ctx.textAlign = "center";
	ctx.fillText("Timp rămas: " + gameTime.toFixed(0), canvas.width * 0.5, 40);
}

//functia deseneaza tinta si sagetile infipte in ea si in podea
//de asemenea calculeaza pozitia viitoare a tintei in functie viteza acesteia, si detecteaza coliziunea cu marginea de sus/podeaua
function drawTargetAndArrows() {
	ctx.fillStyle = "black";
	ctx.fillRect(targetX, targetY, targetWidth, targetHeight);
	for(var nr = 0; nr < arrowsStuckTarget.length; nr++)
		drawImage(arrow, arrowsStuckTarget[nr].x, arrowsStuckTarget[nr].y + targetY, 0.5, arrowsStuckTarget[nr].angle);
	for(var nr = 0; nr < arrowsStuckFloor.length; nr++)
		drawImage(arrow, arrowsStuckFloor[nr].x, arrowsStuckFloor[nr].y, 0.5, arrowsStuckFloor[nr].angle);
	targetY += targetSpeed;
	if(targetY < 0 || targetY + targetHeight > podeaY)
		targetSpeed = -targetSpeed;
}

//functia deseneaza segmentul trasat cu mouse-ul
function drawMouseSegment() {
	ctx.beginPath();
	ctx.moveTo(mouseInitX, mouseInitY);
	if(euclidianDistance(mouseInitX,mouseInitY,mouseFinX,mouseFinY) > distMax) {		//daca segmentul trasat are o lungime mai mare decat distanta maxima admisa, restul segmentului nu este desenat 			
		mouseFinX = mouseInitX - distMax * Math.cos(alfa);
		mouseFinY = mouseInitY + distMax * Math.sin(alfa);
	}
	ctx.lineTo(mouseFinX, mouseFinY);
	ctx.strokeStyle = 'black';
	ctx.stroke();
}

//deseneaza statisticile (puterea si unghiul)
function drawStats() {
	ctx.fillStyle = "white";
	ctx.font = "30px Georgia";
	ctx.textAlign = "start";
	ctx.fillText("Putere: " + power + "%", 20, 90);										//afisarea puterii in procente
	ctx.fillText("Unghi: " + (alfa / Math.PI * 180).toFixed(2) + "\xB0", 20, 130);		//afisarea unghiului in grade
}

//deseneaza o imagine ce poate fi rotita si redimensionata
function drawImage(image, x, y, scale, rotation) {
    ctx.setTransform(scale, 0, 0, scale, x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
	ctx.setTransform(1,0,0,1,0,0);
} 

//deseneaza sageata in aer, in functie de timp
function drawArrow() {
	var v = Math.sqrt(v0 * v0 + g * g * currentTime * currentTime - 2 * v0 * g * currentTime * Math.sin(alfa));
	var theta = Math.acos(v0 / v * Math.cos(alfa));
	currentY = coord_y(currentTime);
	if(!passedMiddle && prevY > currentY)
		passedMiddle = true;
	prevY = currentY;
	currentX = nextX;
	currentTime += 10 / framesPerSecond;
	nextX = coord_x(currentTime);	
	if(pozArcY - currentY > podeaY) {
		arrowsStuckFloor.push({x: pozArcX + currentX, y: pozArcY - currentY, angle: theta});
		arrowInAir = false;
	}
	if(currentX + pozArcX <= targetX && nextX + pozArcX >= targetX)
		if(collisionDetection(currentTime - 10 / framesPerSecond))
			arrowInAir = false;
	if(pozArcX + currentX < 0)
		arrowInAir = false;
	if(pozArcX + currentX > canvas.width)
		arrowInAir = false;
	if(arrowInAir) {
		if(!passedMiddle)
			drawImage(arrow, currentX + pozArcX, pozArcY - currentY, 0.5, -theta);
		else
			drawImage(arrow, currentX + pozArcX, pozArcY - currentY, 0.5, theta);
	}
}

//deseneaza un punct (un cerc cu raza de 2 pixeli)
function drawPoint(x, y, alpha) {
	ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
	ctx.beginPath();
	ctx.arc(x, y, 2, 0, Math.PI * 2);
	ctx.fill();
}

//deseneaza ecranul de sfarsit de joc, afisand scorul obtinut
function drawGameOver() {
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.font = "70px Georgia";
	ctx.fillText("Timpul a expirat!", canvas.width * 0.5, canvas.height * 0.35);
	ctx.font = "40px Georgia";
	ctx.fillText("Scorul tău: " + score, canvas.width * 0.5, canvas.height * 0.35 + 80);
	ctx.beginPath();
	ctx.ellipse(canvas.width * 0.5 ,canvas.height * 0.5 + 160, 120, 50, 0, 0, Math.PI * 2);
	if(ctx.isPointInPath(mouseFinX, mouseFinY))
		ctx.fillStyle = "white";
	else
		ctx.fillStyle = "black";
	ctx.fill();
	if(ctx.isPointInPath(mouseFinX, mouseFinY))
		ctx.fillStyle = "black";
	else
		ctx.fillStyle = "white";
	ctx.font = "30px Georgia";
	ctx.fillText("Joacă din nou!", canvas.width * 0.5, canvas.height * 0.5 + 165);
}

//functia principala de desenare, in care sunt apelate celelalte functii
function draw() {
	ctx.fillStyle = 'grey';
	ctx.fillRect(0, 0, canvas.width, canvas.height);		//deseneaza fundalul
	ctx.fillStyle = 'black';
	ctx.fillRect(0, podeaY + 1, canvas.width, 2);			//deseneaza podeaua
	if(gameTime <= 0) {
		gameOver = true;
		drawGameOver();
	}
	else {
		drawScoreAndTimeLeft();
		gameTime -= 1/framesPerSecond;
		if(mousePressed && !arrowInAir) {
			alfa = Math.atan2(mouseFinY-mouseInitY, mouseInitX-mouseFinX);		//se calculeaza noul unghi alfa dupa coordonatele mouse-ului atunci cand este initializat click-ul si in momentul prezent
			v0 = Math.min(euclidianDistance(mouseInitX,mouseInitY,mouseFinX,mouseFinY), distMax) / (distMax/vmax);		//se calculeaza noua putere in functie de lungimea segmentului trasat, pana la un maxim
			power = (v0/vmax*100).toFixed(2);
			drawMouseSegment();
			drawStats();
		}
	}
	drawTargetAndArrows();
	if(!mousePressed || arrowInAir || gameOver) {
		drawImage(sprite[0], pozArcX, pozArcY, 0.5, -alfa);
		if(arrowInAir)	
				drawArrow();					//deseneaza sageata in aer
	}
	else {
		for(var t = 0.1; ; t += 0.1) {		//desenarea traiectoriei, oprindu-se cand "atinge" podeaua sau cand transparenta devine 0
			toDrawX = coord_x(t);
			toDrawY = coord_y(t);
			if(pozArcY - toDrawY > podeaY || 1 - (toDrawX + toDrawY) * 0.002 <= 0)
				break;
			drawPoint(toDrawX + pozArcX, pozArcY - toDrawY, 1 - (toDrawX + toDrawY) * 0.002);
		}
		drawImage(sprite[Math.floor(power / 10) + 1], pozArcX, pozArcY, 0.5, -alfa);		//desenarea arcului, in functie de putere
	}
}