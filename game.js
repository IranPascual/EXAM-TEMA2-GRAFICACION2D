const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let ship = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    bullets: [],
    bulletSize: 5 // Tamaño inicial de las balas
};

let asteroids = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOverFlag = false;
let asteroidInterval = 500; // Intervalo inicial para generar asteroides
let asteroidSpeed = 2; // Velocidad inicial de los asteroides
let massiveAsteroidFlag = false;
let massiveAsteroid = null;

document.addEventListener('mousemove', updateMousePosition);
document.addEventListener('keydown', handleKeyDown);
canvas.addEventListener('click', handleClick); // Evento para manejar clics en el canvas

let gameStarted = false;

function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    ship.x = event.clientX - rect.left - ship.width / 2;
    ship.y = event.clientY - rect.top - ship.height / 2;
}

function handleKeyDown(event) {
    if (event.key === ' ' && gameStarted) { // Barra espaciadora
        shootBullet();
    }
}

function handleClick(event) {
    if (!gameStarted) { // Comenzar el juego al hacer clic en el canvas
        gameStarted = true;
        initGame(); // Iniciar el juego
    }
}

function drawShip() {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(ship.x + ship.width / 2, ship.y + ship.height);
    ctx.lineTo(ship.x - ship.width / 2, ship.y + ship.height);
    ctx.closePath();
    ctx.fill();
}

// Función para disparar una bala
function shootBullet() {
    const bullet = {
        x: ship.x,
        y: ship.y,
        width: ship.bulletSize, // Usa el tamaño de bala actual
        height: 10,
        speed: 5
    };
    ship.bullets.push(bullet);

    // Reproducir el sonido del disparo
    const shootSound = document.getElementById('shootSound');
    shootSound.currentTime = 0; // Reiniciar el sonido si ya está reproduciéndose
    shootSound.play();
}

// Iniciar música de fondo
const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.5; // Ajustar el volumen de la música de fondo
backgroundMusic.play();

function drawBullets() {
    ship.bullets.forEach((bullet, index) => {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.y -= bullet.speed;

        if (bullet.y < 0) {
            ship.bullets.splice(index, 1);
        }
    });
}

function createAsteroid() {
    if (massiveAsteroidFlag) {
        return;
    }

    const rand = Math.random();
    let size, hits, points, speed, x;

    if (rand < 0.02 && !massiveAsteroid) { // Reducimos la probabilidad de aparición del mega meteorito al 2%
        size = canvas.width;
        hits = 20;
        points = 100;
        speed = 1; // Velocidad más lenta
        x = (canvas.width - size) / 2; // Aparece en el centro horizontal
        massiveAsteroid = {
            x: x,
            y: -size,
            radius: size / 2,
            speed: speed,
            hits: hits,
            points: points
        };
        massiveAsteroidFlag = true;
        alert('¡Atención! ¡Un meteorito masivo se está aproximando!');
    } else {
        if (rand < 0.3) { // 30% de probabilidad de meteorito grande
            size = 80 + Math.random() * 50; // Tamaño más grande entre 80 y 130
            hits = 3;
            points = 10;
            speed = asteroidSpeed + Math.random() * 2; // Velocidad menor para meteoritos más grandes
        } else { // 70% de probabilidad de meteorito pequeño
            size = 30 + Math.random() * 40; // Tamaño más grande entre 30 y 70
            hits = 1;
            points = 1;
            speed = asteroidSpeed + Math.random() * 3;
        }
        x = Math.random() * (canvas.width - size); // Aparece en una posición aleatoria

        const asteroid = {
            x: x,
            y: -size,
            radius: size / 2,
            speed: speed,
            hits: hits,
            points: points,
            canSplit: true // Nuevo atributo para indicar si el asteroide se puede dividir
        };
        asteroids.push(asteroid);
    }
}

function drawAsteroids() {
    if (massiveAsteroidFlag && massiveAsteroid) {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(massiveAsteroid.x + massiveAsteroid.radius, massiveAsteroid.y + massiveAsteroid.radius, massiveAsteroid.radius, 0, Math.PI * 2);
        ctx.fill();
        massiveAsteroid.y += massiveAsteroid.speed;

        if (massiveAsteroid.y > canvas.height) {
            massiveAsteroid = null;
            massiveAsteroidFlag = false
                ;
        }

        if (checkCollision(massiveAsteroid, ship)) {
            gameOver();
        }

        ship.bullets.forEach((bullet, bulletIndex) => {
            if (checkCollision(bullet, massiveAsteroid)) {
                massiveAsteroid.hits--;
                ship.bullets.splice(bulletIndex, 1);

                if (massiveAsteroid.hits <= 0) {
                    score += massiveAsteroid.points;
                    massiveAsteroid = null;
                    massiveAsteroidFlag = false;
                }
            }
        });
    } else {
        asteroids.forEach((asteroid, index) => {
            // Generar un color aleatorio
            const color = getRandomColor();

            ctx.fillStyle = color; // Establecer el color aleatorio
            ctx.beginPath();
            ctx.arc(asteroid.x + asteroid.radius, asteroid.y + asteroid.radius, asteroid.radius, 0, Math.PI * 2);
            ctx.fill();
            asteroid.y += asteroid.speed;

            if (asteroid.y > canvas.height) {
                asteroids.splice(index, 1);
            }

            if (checkCollision(asteroid, ship)) {
                gameOver();
            }

            // Lógica para dividir asteroides al ser golpeados
            ship.bullets.forEach((bullet, bulletIndex) => {
                if (checkCollision(bullet, asteroid)) {
                    asteroid.hits--;

                    // Si el asteroide puede dividirse y todavía tiene hits restantes
                    if (asteroid.canSplit && asteroid.hits > 0) {
                        let numNewAsteroids = 2; // Número predeterminado de nuevos asteroides a generar

                        // Ajustar el número de nuevos asteroides basado en el tamaño del asteroide original
                        if (asteroid.radius > 50) {
                            numNewAsteroids = 3; // Si el asteroide es grande, generar más asteroides
                        }
                        for (let i = 0; i < numNewAsteroids; i++) {
                            // Crear nuevos asteroides con tamaños y atributos ligeramente diferentes
                            const newSize = asteroid.radius * 0.6; // Reducir el tamaño del nuevo asteroide
                            const newSpeed = asteroid.speed + Math.random() * 2; // Ajustar la velocidad del nuevo asteroide

                            // Crear un nuevo asteroide
                            const newAsteroid = {
                                x: asteroid.x + Math.random() * 20 - 10, // Posición ligeramente aleatoria
                                y: asteroid.y + Math.random() * 20 - 10, // Posición ligeramente aleatoria
                                radius: newSize,
                                speed: newSpeed,
                                hits: 1, // Nuevo asteroide solo necesita un golpe para ser eliminado
                                points: 1, // Puntos otorgados por eliminar el nuevo asteroide
                                canSplit: false // Los nuevos asteroides no se pueden dividir más
                            };

                            // Agregar el nuevo asteroide a la lista de asteroides
                            asteroids.push(newAsteroid);
                        }
                    }

                    // Eliminar el asteroide original
                    ship.bullets.splice(bulletIndex, 1);
                    if (asteroid.hits <= 0) {
                        score += asteroid.points;
                        asteroids.splice(index, 1);
                    }
                }
            });
        });
    }
}
function getRandomColor() {
    const colors = ['#FFFF00', '#808080', '#FF0000']; // Amarillo, gris, rojo
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

function checkCollision(obj1, obj2) {
    const distX = Math.abs(obj1.x + (obj1.radius || obj1.width / 2) - obj2.x - (obj2.radius || obj2.width / 2));
    const distY = Math.abs(obj1.y + (obj1.radius || obj1.height / 2) - obj2.y - (obj2.radius || obj2.height / 2));

    if (distX > (obj2.radius || obj2.width / 2) + (obj1.radius || obj1.width / 2) || distY > (obj2.radius || obj2.height / 2) + (obj1.radius || obj1.height / 2)) {
        return false;
    }

    return true;
}

// Definición de tipos de power-ups
const powerUpTypes = {
    LARGE_BULLETS: 'large_bullets',
    TRIPLE_SHOT: 'triple_shot',
    SHIELD: 'shield'
};

// Duración del efecto del power-up en milisegundos (5 segundos)
const powerUpDuration = 5000;

// Arreglo para almacenar los power-ups
let powerUps = [];

// Generar un número aleatorio para determinar si se genera un power-up
const generatePowerUp = () => {
    const rand = Math.random();
    if (rand < 0.1) { // Aumenta la probabilidad si es necesario para pruebas
        // 2% de probabilidad de generar un power-up
        const type = Object.values(powerUpTypes)[Math.floor(Math.random() * Object.values(powerUpTypes).length)];
        const powerUp = {
            x: Math.random() * (canvas.width - 30), // Posición aleatoria en el ancho del canvas
            y: -30, // Aparece arriba del canvas
            size: 30, // Tamaño del power-up
            type: type // Tipo de power-up
        };
        powerUps.push(powerUp);
        console.log("Power-up generado:", powerUp); // Agregado para depuración
    }
};

// Dibujar los power-ups
const drawPowerUps = () => {
    powerUps.forEach((powerUp, index) => {
        ctx.fillStyle = getColorByPowerUpType(powerUp.type);
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.size, powerUp.size);
        powerUp.y += 1; // Velocidad de caída de los power-ups

        // Colisión del power-up con la nave
        if (checkCollision(powerUp, ship)) {
            applyPowerUpEffect(powerUp.type);
            powerUps.splice(index, 1);
            console.log("Power-up colisionado con la nave:", powerUp); // Agregado para depuración
        }

        // Eliminar power-up si sale del canvas
        if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
            console.log("Power-up fuera del canvas, eliminado:", powerUp); // Agregado para depuración
        }
    });
};

// Aplicar el efecto del power-up a la nave
const applyPowerUpEffect = (type) => {
    switch (type) {
        case powerUpTypes.LARGE_BULLETS:
            ship.bulletSize = 10; // Balas más grandes
            setTimeout(() => {
                ship.bulletSize = 5; // Restaurar tamaño de balas después de 5 segundos
            }, powerUpDuration);
            console.log("Power-up aplicado: Balas más grandes"); // Agregado para depuración
            break;
        case powerUpTypes.TRIPLE_SHOT:
            // Disparo triple
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    shootBullet();
                }, i * 200); // Espaciar los disparos cada 200 milis
                egundos
            }
            console.log("Power-up aplicado: Disparo triple"); // Agregado para depuración
            break;
        case powerUpTypes.SHIELD:
            // Implementar lógica para un escudo protector
            // Aquí se puede agregar una lógica para que la nave sea invulnerable durante unos segundos
            console.log("Power-up aplicado: Escudo protector"); // Agregado para depuración
            break;
        default:
            break;
    }
};


// Obtener el color del power-up según su tipo
const getColorByPowerUpType = (type) => {
    switch (type) {
        case powerUpTypes.LARGE_BULLETS:
            return 'blue'; // Color para balas más grandes
        case powerUpTypes.TRIPLE_SHOT:
            return 'green'; // Color para dispar
        case powerUpTypes.TRIPLE_SHOT:
            return 'green'; // Color para disparo triple
        case powerUpTypes.SHIELD:
            return 'purple'; // Color para el escudo
        default:
            return 'white';
    }
};

// Función para manejar el fin del juego
const gameOver = () => {
    gameOverFlag = true;
    ctx.fillStyle = 'red';
    ctx.font = '48px sans-serif';
    ctx.fillText('GAME OVER', canvas.width / 2 - 200, canvas.height / 2); // Ajustado para centrar en el canvas
    if (score > highScore) {
        highScore = score;
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    clearInterval(gameInterval);
    clearInterval(asteroidIntervalId);
    clearInterval(powerUpIntervalId);
};

// Función para reiniciar el juego al hacer clic en el canvas después de que el juego haya terminado
function restartGame() {
    if (gameOverFlag) {
        // Reiniciar todos los valores del juego
        initGame();
    }
}

// Inicializar el juego
const initGame = () => {
    score = 0;
    ship.bullets = [];
    asteroids = [];
    powerUps = [];
    gameOverFlag = false;
    asteroidSpeed = 2;
    massiveAsteroidFlag = false;
    massiveAsteroid = null;
    gameInterval = setInterval(gameLoop, 1000 / 60);
    asteroidIntervalId = setInterval(createAsteroid, asteroidInterval);
    powerUpIntervalId = setInterval(generatePowerUp, 10000); // Generar power-up cada 10 segundos
};

// Lógica principal del juego
const gameLoop = () => {
    if (gameOverFlag) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawShip();
    drawBullets();
    drawAsteroids();
    drawPowerUps();

    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Score: ${score}`, 65, 30); // Ajustado para que no se salga del canvas
    ctx.fillText(`Record Mundial: ${highScore}`, 125, 60); // Ajustado para que no se salga del canvas
};

// Dibujar la pantalla de inicio
const drawStartScreen = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bienvenido a LUNAR BATTLE', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px sans-serif';
    ctx.fillText('Instrucciones:', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Mueve la nave con el ratón', canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText('Dispara con la barra espaciadora', canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Haz clic para empezar', canvas.width / 2, canvas.height / 2 + 120);
};

// Dibujar el juego o la pantalla de inicio según el estado del juego
const drawGameOrStartScreen = () => {
    if (gameStarted) {
        gameLoop();
    } else {
        drawStartScreen();
    }
};

// Iniciar el juego
let gameInterval = setInterval(drawGameOrStartScreen, 1000 / 60);
let asteroidIntervalId;
let powerUpIntervalId;

